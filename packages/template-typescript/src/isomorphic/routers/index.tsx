import loadable from '@loadable/component';
import React from "react";
import NotFound from "../pages/NotFound";
import ArticleDetail from "../pages/ArticleDetail";
import VideoDetail from "../pages/VideoDetail";

const AsyncCom = loadable(() => import("../pages/VideoDetail"));
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