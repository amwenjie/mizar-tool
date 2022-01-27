import Notifier from "node-notifier";

export class NoticeUtil {
    public static message(titleStr: string, messageStr: string): void {
        Notifier.notify({
            message: titleStr,
            title: messageStr,
            wait: true,
        });
    }
}
export default NoticeUtil;
