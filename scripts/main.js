const getPageImage = (reader, page) => {
    const img = document.createElement("img");
    document.body.append(img);
    reader.getPageImage({
        success(url) {
            img.src = url;
            if(reader.numImageConverts >= reader.numPages) console.log(Date.now() - reader.pdfLoadedTime, "ms");
        }, error(e) {
            img.remove();
            console.error(e);
            if(reader.numImageConverts >= reader.numPages) console.log(Date.now() - reader.pdfLoadedTime, "ms");
        }
    }, page);
};

const showPDFImages = (reader, pages) => {
    for(let i = 1; i <= pages; i++) {
        getPageImage(reader, i);
    }
};

document.getElementById("inputFile").onchange = event => {
    const reader = new PDFReader({
        numWorkers: 3,
        success(pages) {
            showPDFImages(reader, pages);
        },error(e) {
            console.error(e);
            reader.close();
        }
    }, event.target.files[0] || event.dataTransfer.files[0]);
    event.target.value = null;
}