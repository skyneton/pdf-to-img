const http = require("http");
const nodeStatic = require("node-static");
const fileServer = new nodeStatic.Server();
http.createServer((req, res) => {
    fileServer.serve(req, res);
}).listen(80);