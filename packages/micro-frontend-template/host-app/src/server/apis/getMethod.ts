import like from "./(path)/method";

export function post(req, res) {
    res.send('getMethod post');
    like(req, res);
    console.log("post");
}
export default function (req, res) {
    res.send('getMethod default');
    console.log("getMethod");
}