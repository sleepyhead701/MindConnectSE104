import { getBackendReadyState } from "../../shared/state.js";
import { showNotification } from "../utils/utils.js";

export function blockIfBackendNotReady() {
    if (getBackendReadyState()) return false;
    setTimeout(() => showNotification('⏳ Backend chưa sẵn sàng, vui lòng chỉ xem giao diện.'), 1000 );
    return true;
}
