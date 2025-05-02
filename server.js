// import https from 'https';
// import fs from 'fs';
// import url from 'url';
// import API from './api.js';

// const PORT = process.env.PORT || 3000;

// const options = {
//     key: fs.readFileSync('./certificates/key.pem'),
//     cert: fs.readFileSync('./certificates/cert.pem')
// };

// const server = https.createServer(options, async (req, res) => {
//     // Set CORS headers
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
//     res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
//     // Parse URL
//     const parsedUrl = url.parse(req.url, true);
//     const path = parsedUrl.pathname;

//     switch(req.method.toLocaleLowerCase()) {
//         case 'get': handlerGet(req, res, path); break;
//         case 'post': handlePost(req, res, path); break;
//         default: {
//             res.writeHead(405, { 'Content-Type': 'application/json' });
//             res.end(JSON.stringify({ error: 'Method not allowed' }));
//             return;
//         }
//     }
// });

// // add rate limiting in future
// async function handlePost(req, res, path) {
//     try {
//         let body = '';

//         req.on('data', chunk => {
//             body += chunk.toString();
//         });

//         req.on('end', async () => {
//             const data = JSON.parse(body);

//             console.log(path)

//             if(path.startsWith('/api/')) return API.handlePost(res, path, data);
            
            
//             // default
//             res.writeHead(404, { 'Content-Type': 'application/json' });
//             res.end(JSON.stringify({ error: 'Not found' }));
//         });
//     } 
//     catch(error) {
//         res.writeHead(500, { 'Content-Type': 'application/json' });
//         res.end(JSON.stringify({ error: error.message }));
//     }
// }

// async function handlerGet(req, res, path) {
//     const WEBSITE_ROOT = './website';

//     try {
//         if(path.startsWith('/api/')) return API.handleGet(res, path, {});

//         if(path === '/' || path === '') {
//             path = '/index.html';
//         }

//         let filePath = WEBSITE_ROOT + path;

//         fs.access(filePath, fs.constants.R_OK, (error) => {
//             if(error) {
//                 fs.readFile(WEBSITE_ROOT + '/error/404.html', (error, data) => {
//                     if (error) {
//                       // No custom 404 page available
//                       res.writeHead(404, { 'Content-Type': 'text/plain' });
//                       res.end('404 Not Found');
//                       return;
//                     }
//                     res.writeHead(404, { 'Content-Type': 'text/html' });
//                     res.end(data);
//                   });
//                   return;
//             }

//             fs.readFile(filePath, (err, data) => {
//                 if(err) {
//                     res.writeHead(500, { 'Content-Type': 'text/plain' });
//                     res.end('500 Internal Server Error');
//                 } else {
//                     const ext = path.split('.').pop().toLowerCase();
//                     const contentType = getContentType(ext);
                    
//                     res.writeHead(200, { 'Content-Type': contentType });
//                     res.end(data);
//                 }
//             });
//         });
//     }
//     catch (error) {
//         res.writeHead(500, { 'Content-Type': 'application/json' });
//         res.end(JSON.stringify({ error: error.message }));
//     }
// }

// function getContentType(extension) {
//     const contentTypes = {
//       'html': 'text/html',
//       'css': 'text/css',
//       'js': 'text/javascript',
//       'json': 'application/json',
//       'png': 'image/png',
//       'jpg': 'image/jpeg',
//       'jpeg': 'image/jpeg',
//       'gif': 'image/gif',
//       'svg': 'image/svg+xml',
//       'ico': 'image/x-icon',
//       'pdf': 'application/pdf',
//       'txt': 'text/plain',
//       'mp4': 'video/mp4',
//       'webm': 'video/webm',
//       'mp3': 'audio/mpeg',
//       'woff': 'font/woff',
//       'woff2': 'font/woff2',
//       'ttf': 'font/ttf',
//       'otf': 'font/otf',
//       'eot': 'application/vnd.ms-fontobject'
//     };
    
//     return contentTypes[extension] || 'application/octet-stream';
//   }

//   server.listen(PORT, () => {
//     console.log(`HTTPS server running on https://127.0.0.1:${PORT}`);
//   });

