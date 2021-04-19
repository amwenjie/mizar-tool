export interface IImage {
    src: string;
    summary: string;
    currentShowed?: boolean;
}

export interface IProps {
    data: string;
    dispatch: any;
    match?;
    history;
}

export interface IVideoPlayerRect {
    top: number;
    left: number;
    height: number;
    width: number;
}

export interface IVideoPlayerParam extends IVideoPlayerRect {
    id: number;
    type: number;
    poster: string;
    display: string;
    beginTime?: number;
    showDanmu?: boolean;
    playerTransition: string;
    autoplay?: boolean;
}
