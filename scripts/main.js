const getPageImage = (reader, page) => {
    const canvas = document.createElement("img");
    document.body.appendChild(canvas);

    reader.getPageImage({
        success(url) {
            canvas.src = url;
            if(reader.numImageConverts >= reader.numPages) reader.close();
        }, error(e) {
            canvas.remove();
            console.error(e);
            if(reader.numImageConverts >= reader.numPages) reader.close();
        },
        scale: 96.0 / 72.0 * 0.8,
        maxWidth: 800,
        maxHeight: 800,
        toURL: true,
        page,
    });
};

const showPDFImages = (reader, pages) => {
    for(let i = 1; i <= pages; i++) {
        getPageImage(reader, i);
    }
};

const getDocument = file => {
    return new Promise((resolve, reject) => {
        const reader = new PDFReader({
            numWorkers: 3,
            success() {
                resolve(reader);
            },error(e) {
                reader.close();
                reject(e);
            },
            file
        });
    });
}

document.getElementById("inputFile").onchange = async event => {
    const files = (() => {
        const collator = new Intl.Collator("en", {numeric: true, sensitivity: "base"});
        return [...(event.target.files || event.dataTransfer.files)].sort((a, b) => collator.compare(a.name, b.name));
    })();

    for(let i = 0; i < files.length; i++) {
        const reader = await getDocument(files[i]);
        showPDFImages(reader, reader.numPages);
    }
    event.target.value = null;
}

window.onclick = () => {
    const inputBox = document.getElementById("inputFile");
    if(inputBox.hasAttribute("hide")) inputBox.removeAttribute("hide");
    else inputBox.setAttribute("hide", true);
}

window.oncontextmenu = e => {
    e.preventDefault();
}