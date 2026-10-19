import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { installNativeCrypto } from '../utils/nativeCrypto';
if(Platform.OS!=='web')installNativeCrypto(globalThis,Crypto);
