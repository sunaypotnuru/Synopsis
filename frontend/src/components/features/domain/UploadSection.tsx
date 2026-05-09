import { motion } from "motion/react";
import { Upload, Camera, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function UploadSection() {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // clear input to allow same file selection later
    if (e.target) e.target.value = "";
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-[#0F172A] mb-4">{t('components.upload_section.upload_your_image', "Upload Your Image")}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Take a clear photo of the conjunctiva (inner eyelid) in good lighting for best results.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Upload Area */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-4 border-dashed rounded-3xl p-12 transition-all duration-300 ${isDragging
                  ? "border-[#0D9488] bg-[#0D9488]/5 scale-105"
                  : "border-gray-300 hover:border-[#0D9488]/50"
                }`}
            >
              <div className="text-center">
                <div className="inline-block transition-transform duration-300 hover:-translate-y-2">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#0D9488] to-[#0EA5E9] rounded-3xl flex items-center justify-center shadow-xl">
                    <Upload className="w-12 h-12 text-white" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-[#0F172A] mb-3">{t('components.upload_section.drop_your_image_here_1', "Drop your image here")}</h3>
                <p className="text-gray-600 mb-6">
                  or click to browse from your device
                </p>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button
                    asChild
                    size="lg"
                    className="bg-[#0D9488] hover:bg-[#0F766E] text-white font-semibold px-8"
                  >
                    <span className="cursor-pointer">
                      <FileImage className="w-5 h-5 mr-2" />{t('components.upload_section.choose_file_2', "Choose File")}</span>
                  </Button>
                </label>

                <div className="mt-6 flex items-center justify-center gap-4">
                  <div className="h-px bg-gray-300 flex-1" />
                  <span className="text-gray-500 text-sm">or</span>
                  <div className="h-px bg-gray-300 flex-1" />
                </div>

                <Button
                  size="lg"
                  variant="outline"
                  className="mt-6 border-2 border-[#0EA5E9] text-[#0EA5E9] hover:bg-[#0EA5E9] hover:text-white font-semibold px-8"
                >
                  <Camera className="w-5 h-5 mr-2" />{t('components.upload_section.take_photo_3', "Take Photo")}</Button>
              </div>
            </div>

            <p className="text-sm text-gray-500 mt-4 text-center">
              Supported formats: JPG, PNG, JPEG • Max size: 10MB
            </p>
          </motion.div>

          {/* Preview/Instructions */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {uploadedImage ? (
              <div className="bg-white rounded-3xl shadow-xl p-6 border-2 border-[#0D9488]">
                <h3 className="text-xl font-bold text-[#0F172A] mb-4">{t('components.upload_section.image_preview_4', "Image Preview")}</h3>
                <div className="relative rounded-2xl overflow-hidden mb-4">
                  <img
                    src={uploadedImage}
                    alt="Uploaded"
                    className="w-full h-auto"
                  />
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-[#0D9488] to-[#0EA5E9] hover:from-[#0F766E] hover:to-[#0284C7] text-white font-semibold py-6"
                  size="lg"
                >{t('components.upload_section.analyze_image_5', "Analyze Image")}</Button>
                <Button
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={() => setUploadedImage(null)}
                >{t('components.upload_section.remove_image_6', "Remove Image")}</Button>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-[#0D9488]/10 to-[#0EA5E9]/10 rounded-3xl p-8">
                <h3 className="text-2xl font-bold text-[#0F172A] mb-6">{t('components.upload_section.guidelines_for_best_results_7', "Guidelines for Best Results")}</h3>
                <div className="space-y-4">
                  {[
                    "Ensure good lighting conditions",
                    "Gently pull down the lower eyelid",
                    "Capture the inner pink part (conjunctiva)",
                    "Keep the image clear and in focus",
                    "Avoid shadows on the eye area",
                  ].map((tip, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1, duration: 0.4 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#0D9488] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <p className="text-gray-700">{tip}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Example placeholder */}
                <div className="mt-8 p-4 bg-white rounded-2xl shadow-md">
                  <p className="text-sm text-gray-600 mb-2 font-semibold">{t('components.upload_section.example_8', "Example:")}</p>
                  <div className="w-full h-40 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center">
                    <Camera className="w-12 h-12 text-gray-400" />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
