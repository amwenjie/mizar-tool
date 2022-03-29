export class DateUtil {
    /**
     * @param Date date
     * @param format "yyyy-MM-dd hh:mm:ss.uuu"
     * @return string date
     */
    public static formatByString(date: Date, format: string): string {
        const o = {
            "M+": date.getMonth() + 1,
            "d+": date.getDate(),
            "h+": date.getHours(),
            "m+": date.getMinutes(),
            "q+": Math.floor((date.getMonth() + 3) / 3),
            "s+": date.getSeconds(),
            "u+": date.getMilliseconds(),
        };
        if (/(y+)/.test(format)) {
            format = format.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
        }
        for (const k in o) {
            if (Object.prototype.hasOwnProperty.call(o, k)) {
                let pad = "00";
                if (k === "u+") {
                    pad = "000";
                }
                if (new RegExp("(" + k + ")").test(format)) {
                    format = format
                        .replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : (pad + o[k]).substr(("" + o[k]).length));
                }
            }
        }
        return format;
    }

    /**
     * @param Date date
     * @return string  "yyyy-MM-dd hh:mm:ss.uuu"
     */
    public static getDateTimeString(date): string {
        return DateUtil.formatByString(date, "yyyy-MM-dd hh:mm:ss.uuu");
    }

    /**
     * @param Date date
     * @return string "yyyyMMddhhmmssuuu"
     */
    public static getDateTimeNumber(date): string {
        return DateUtil.formatByString(date, "yyyyMMddhhmmssuuu");
    }
}
export default DateUtil;
