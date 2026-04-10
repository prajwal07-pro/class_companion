import * as faceapi from '@vladmandic/face-api';
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

let modelsLoaded = false;

export const loadFaceApiModels = async (): Promise<void> => {
  if (modelsLoaded) return;
  
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log('Face-api models loaded successfully');
  } catch (error) {
    console.error('Error loading face-api models:', error);
    throw new Error('Failed to load face recognition models');
  }
};

export const detectFace = async (
  videoElement: HTMLVideoElement
): Promise<faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>> | null> => {
  const detection = await faceapi
    .detectSingleFace(videoElement)
    .withFaceLandmarks()
    .withFaceDescriptor();
  
  return detection || null;
};

export const extractFaceDescriptor = async (
  videoElement: HTMLVideoElement
): Promise<Float32Array | null> => {
  const detection = await detectFace(videoElement);
  return detection?.descriptor || null;
};

export const compareFaceDescriptors = (
  descriptor1: Float32Array | number[],
  descriptor2: Float32Array | number[]
): number => {
  const arr1 = Array.from(descriptor1);
  const arr2 = Array.from(descriptor2);
  
  if (arr1.length !== arr2.length) {
    throw new Error('Descriptors must have the same length');
  }
  
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    sum += Math.pow(arr1[i] - arr2[i], 2);
  }
  
  return Math.sqrt(sum);
};

export const isFaceMatch = (
  descriptor1: Float32Array | number[],
  descriptor2: Float32Array | number[],
  threshold: number = 0.6
): boolean => {
  const distance = compareFaceDescriptors(descriptor1, descriptor2);
  return distance < threshold;
};

export { faceapi };
