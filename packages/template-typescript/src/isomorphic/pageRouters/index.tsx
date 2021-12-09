const pageRouter = [
    {
        path: "/detail/video/:id",
        element: () => "../pages/VideoDetail",
    },
    {
        path: "/detail/article/:id",
        element: "../pages/ArticleDetail",
    },
    {
        path: "*",
        element: "../pages/NotFound",
    },
];

export default pageRouter;
