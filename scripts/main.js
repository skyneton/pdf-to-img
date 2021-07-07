const getPageImage = (reader, page) => {
    const img = document.createElement("img");
    document.body.append(img);
    reader.getPageImage({
        success(url) {
            img.src = url;
        }, error(e) {
            img.remove();
            console.error(e);
        }
    }, page);
};

const showPDFImages = (reader, pages) => {
    for(let i = 1; i <= pages; i++) {
        getPageImage(reader, i);
    }
};

document.getElementById("inputFile").onchange = event => {
    const reader =window.a =  new PDFReader({
        success(pages) {
            showPDFImages(reader, pages);
        }
    }, event.target.files[0] || event.dataTransfer.files[0]);
    event.target.value = null;
}