export class ObjectUtil {

    /**
     * 对一个js对象进行排序，按其名称字母
     * @param obj
     */
    public static sort(obj) {
        if (obj instanceof Array) {
            return obj;
        }

        const newObj = {};
        let keys = Object.keys(obj);
        keys = keys.sort();
        keys.map((key) => {
            if (obj[key] instanceof Object && (typeof obj[key] === "function") === false) {
                newObj[key] = ObjectUtil.sort(obj[key]);
            } else {
                newObj[key] = obj[key];
            }
        });

        return newObj;
    }

}
export default ObjectUtil;
