import { articleDetailInitState } from "./initialState";

export function articleDetailReducer(state = articleDetailInitState, action) {
    switch (action.type) {
        default:
            return {
                ...state,
                data: {
                    ...state.data,
                    ...action.data,
                },
            };
    }
}
