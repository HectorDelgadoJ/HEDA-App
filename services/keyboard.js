import { Keyboard, TextInput } from 'react-native';
import { dismissFocusedKeyboard } from '../utils/authInput';
export const dismissAuthKeyboard=()=>dismissFocusedKeyboard(Keyboard,TextInput.State);
