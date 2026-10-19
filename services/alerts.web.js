import {webAlerts} from '../utils/alertQueue';
export const Alert={alert:(...args)=>webAlerts.show(...args)};
