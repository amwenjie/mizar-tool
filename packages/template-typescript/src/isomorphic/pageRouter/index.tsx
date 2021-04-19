import * as React from "react";
import ArticleDetail from "../pages/ArticleDetail";
import VideoDetail from "../pages/VideoDetail";
import NotFound from "../pages/NotFound";

const pageRouter = [
    {
        path: "/detail/video/:id",
        exact: true,
        component: VideoDetail,
    },
    {
        path: "/detail/article/:id",
        exact: true,
        component: ArticleDetail,
    },
    {
        component: NotFound,
    },
];

export default pageRouter;
