import { base44 } from './base44Client';

// Re-export Core integration methods for client-side use.
// UploadFile is the retired spelling of UploadPublicFile — kept for backward compat.
export const UploadFile = base44.integrations.Core.UploadPublicFile;
export const UploadPublicFile = base44.integrations.Core.UploadPublicFile;
export const UploadPrivateFile = base44.integrations.Core.UploadPrivateFile;
export const CreateFileSignedUrl = base44.integrations.Core.CreateFileSignedUrl;
export const InvokeLLM = base44.integrations.Core.InvokeLLM;
export const SendEmail = base44.integrations.Core.SendEmail;
export const GenerateImage = base44.integrations.Core.GenerateImage;
export const GenerateSpeech = base44.integrations.Core.GenerateSpeech;
export const ExtractDataFromUploadedFile = base44.integrations.Core.ExtractDataFromUploadedFile;
export const TranscribeAudio = base44.integrations.Core.TranscribeAudio;