import { Image, Platform } from 'react-native';

const FALLBACK = { uri: "https://cdn-icons-png.flaticon.com/512/149/149071.png" };

const isValidImageUri = (uri) => {
  if (!uri) return false;
  if (typeof uri !== 'string') return false;
  if (Platform.OS === 'web') {
    if (uri.startsWith('blob:')) return false;
    if (uri.startsWith('file:')) return false;
    if (!uri.startsWith('http://') && !uri.startsWith('https://')) return false;
  }
  return true;
};

export default function SafeImage({ uri, style, fallback }) {
  const source = isValidImageUri(uri) ? { uri } : fallback || FALLBACK;
  return <Image source={source} style={style} />;
}