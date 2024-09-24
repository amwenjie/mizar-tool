export function hahah (req, res) {

    res.json({
        text: 'server api path/method/hahah',
        params: req.params,
        query: req.query
    });

    console.log("path/method/hahah");
    console.log("params: ", req.params);
    console.log("query: ", req.query);
    console.log("body: ", req.body);
}

export default function like(req, res) {
    res.send('path/method/default/like');
    console.log("path/method/default/like");
}
