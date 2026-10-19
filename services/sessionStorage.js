import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSecureSessionStorage } from '../utils/secureSessionStorage';
const secure={
  getItemAsync:key=>SecureStore.getItemAsync(key,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}),
  setItemAsync:(key,value)=>SecureStore.setItemAsync(key,value,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}),
  deleteItemAsync:key=>SecureStore.deleteItemAsync(key),
};
export const sessionStorage=createSecureSessionStorage(secure,AsyncStorage,()=>Crypto.randomUUID());
