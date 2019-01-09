let lib = module.exports = require("./head")

require("./parse")
require("./encode")
require("./decode")

lib.load = async function (url)
{
    return new Promise((resolve, reject) =>
    {
        let xmlhttp = new XMLHttpRequest();

        xmlhttp.onreadystatechange = function ()
        {
            if (4 !== xmlhttp.readyState)
                return;

            if (0 !== xmlhttp.status && 200 !== xmlhttp.status)
            {
                reject(Error("status " + xmlhttp.status))
                return
            }

            try
            {
                let root = lib.parse(xmlhttp.responseText)
                resolve(root)
            }
            catch (e)
            {
                reject(e)
            }
        }

        xmlhttp.open("GET", url, true);
        xmlhttp.send(null);
    })

}