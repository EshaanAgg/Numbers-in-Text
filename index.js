const fs = require('fs')
let data = "lol";
fs.writeFile('test.txt', data, (err) => {
    if (err) throw err;
})