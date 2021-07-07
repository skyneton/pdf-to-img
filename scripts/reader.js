const PDF_READER_MAIN_URL = URL.createObjectURL(new Blob([`(${pdfjsLibWorker.toString()})()`]))
    , PDF_WORKER_MAIN_URL = URL.createObjectURL(new Blob([`(${pdfWorkerJs.toString()})()`]));

function PDFReader(options, file) {
    "use strict";
    let WORKER_URL, worker;
    let numPages = 0;
    const idx = [];

    const throwError = (err, options, id) => {
        if(id != undefined && id != null) delete idx[id];

        if(!!options.error) options.error(err);
        else throw err;
    };

    const workerInit = () => {
        if(OffscreenCanvas && Worker && location.protocol.startsWith("http")) {
            WORKER_URL = URL.createObjectURL(new Blob([`(${threadWorker.toString()})()`]));
            worker = new Worker(WORKER_URL);
            worker.addEventListener("message", getThreadMessage);

            const id = idx.length;
            idx[id] = options;
            worker.postMessage({
                type: "init",
                data: file,
                url: [PDF_READER_MAIN_URL, PDF_WORKER_MAIN_URL],
                return: id
            });
        }else {
            throw new Error("Can't Use");
        }
    };

    

    var getThreadMessage = e => {
        const packet = e.data, options = idx[packet.return];
        if(!!options) {
            if(packet.type == "error") throwError(new Error(packet.result), options, packet.return);
            if(packet.isPageNum) numPages = packet.result;
            if(!!options.success) options.success(packet.result);
            delete idx[packet.return];
        }
    };


    var threadWorker = () => {
        const fileReaderAsync = file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(new Uint8Array(reader.result));
                }

                reader.readAsArrayBuffer(file);
            });
        };

        const base64ToArray = base64 => {
            if(base64.includes(",")) base64 = base64.split(",")[1];
            const raw = atob(base64);
            const rawLength = raw.length;
            const array = new Uint8Array(new ArrayBuffer(rawLength));

            for(let i = 0; i < rawLength; i++) array[i] = raw.charCodeAt(i);

            return array;
        };

        const initalizer = async packet => {
            for(let i = 0; i < packet.url.length; i++) {
                importScripts(packet.url[i]);
            }

            try {
                if(packet.data instanceof File) {
                    self.doc = await pdfjsLib.getDocument(await fileReaderAsync(packet.data)).promise;
                }
                else if(packet.data instanceof Uint8Array) {
                    self.doc = await pdfjsLib.getDocument(packet.data).promise;
                }
                else if(packet.data instanceof Blob) {
                    self.doc = await pdfjsLib.getDocument(new Uint8Array(await packet.data.ArrayBuffer()));
                }
                else if(typeof packet.data === "string") {
                    if(packet.data.startsWith("data:")) self.doc = await pdfjsLib.getDocument(base64ToArray(packet.data)).promise;
                    else self.doc = await pdfjsLib.getDocument(packet.data).promise;
                }
                self.postMessage({
                    "type": "success",
                    "isPageNum": true,
                    "result": self.doc.numPages,
                    "return": packet.return
                });
            }catch(e) {
                self.postMessage({
                    "type": "error",
                    "result": e,
                    "return": packet.return
                });
            }
        };

        const getPageImage = async packet => {
            const page = await self.doc.getPage(packet.data);
            const viewport = page.getViewport({scale: 1});
            const canvas = new OffscreenCanvas(viewport.width, viewport.height);

            await page.render({canvasContext: canvas.getContext("2d"), viewport: viewport}).promise;

            self.postMessage({
                "type": "success",
                "result": URL.createObjectURL(await canvas.convertToBlob({ type: "image/jpeg" })),
                "return": packet.return
            });
        };

        self.addEventListener("message", e => {
            const packet = e.data;
            switch(packet.type) {
                case "init": {
                    initalizer(packet);
                    break;
                }
                case "getPageImage": {
                    if(!self.doc) self.postMessage({
                        "type": "error",
                        "result": "PDF Document can't load",
                        "return": packet.return
                    });
                    else getPageImage(packet);
                }
            }
        });
    };


    return new class {
        constructor() {
            if(!(file instanceof File || file instanceof Blob || file instanceof Uint8Array || typeof file === "string")) {
                throw new Error("file type must File or Blob or Uint8Array or string");
            }

            if(typeof options === "undefined") {
                throw new Error("Please input options data");
            }

            workerInit();
        }

        getPageImage(options, page) {
            if(!worker) throw new Error("Can't use");
            const id = idx.length;
            idx[id] = options;
            
            if(typeof options === "undefined") {
                throw new Error("Please input options data");
            }

            worker.postMessage({
                "type": "getPageImage",
                "data": page,
                "return": id
            });
        }

        get numPages() {
            return numPages;
        }

        close() {
            if(!!worker) worker.terminate();
            if(!!WORKER_URL) URL.revokeObjectURL(WORKER_URL);

            for(const key in idx) {
                throwError(new Error("PDFReader closed"), idx[key]);
            }
        };
    }
}