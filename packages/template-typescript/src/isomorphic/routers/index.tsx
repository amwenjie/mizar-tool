import loadable from '@loadable/component';
import React from "react";
import NotFound from "../pages/NotFound/index";
import ArticleDetail from "../pages/ArticleDetail/index";
import VideoDetail from "../pages/VideoDetail/index";

const AsyncCom = loadable(() => import("../pages/VideoDetail/index.js"));
const pageRouter = [
    {
        path: "/detail/iso/:id",
        element: <VideoDetail />,
    },
    {
        path: "/detail/article/:id",
        element: <ArticleDetail />,
    },
    {
        path: "/detail/video/:id",
        element: AsyncCom,
    },
    {
        path: "*",
        element: <NotFound />,
    }
];

export default pageRouter;