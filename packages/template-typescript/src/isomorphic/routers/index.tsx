import loadable, { DefaultComponent, LoadableComponent } from '@loadable/component';
import React, { ReactNode } from "react";
import NotFound from "../pages/NotFound/index";
import ArticleDetail from "../pages/ArticleDetail/index";
import VideoDetail from "../pages/VideoDetail/index";
import Component from 'mizar/iso/Component';

const AsyncCom = loadable(() => import("../pages/VideoDetail/index"));
const pageRouter = [
    {
        path: "/detail/iso/:id",
        element: <AsyncCom />,
    },
    {
        path: "/detail/article/:id",
        element: <ArticleDetail />,
    },
    {
        path: "/detail/video/:id",
        element: <AsyncCom />,
    },
    {
        path: "*",
        element: <NotFound />,
    }
];

export default pageRouter;