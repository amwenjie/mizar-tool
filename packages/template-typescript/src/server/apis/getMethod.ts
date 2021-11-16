export function post(req, res) {
    res.send('getMethod post');

    console.log("post");
}
export default function (req, res) {
    res.send('getMethod default');
    console.log("getMethod");
}