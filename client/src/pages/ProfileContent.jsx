import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import StyledFileInput from '../components/common/StyledFileInput';
import { MdOutlineFileUpload } from 'react-icons/md';
import { IoMdArrowDown } from 'react-icons/io';
import {
  getUploadSignature,
  uploadToS3,
  saveImageUrls,
  uploadReviewsExcel,
  sendProviderSignupNotification,
  getProvider,
} from '../services/api';

function ProfileContent() {
  const navigate = useNavigate();
  const [providerId, setProviderId] = useState(null);

  const [uploadedFiles, setUploadedFiles] = useState({
    headshot: null,
    gallery: null,
    reviews: null,
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get provider ID from localStorage
    const storedProviderId = localStorage.getItem('providerId');
    if (!storedProviderId) {
      // If no provider ID, redirect back to first step
      navigate('/provider-portal');
      return;
    }
    setProviderId(storedProviderId);
  }, [navigate]);

  const handleFileSelect = (field, file) => {
    if (!file) return;

    if (
      (field === 'headshot' || field === 'gallery') &&
      !['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)
    ) {
      alert('Only JPG/PNG image files are allowed for this field.');
      return;
    }

    if (
      field === 'reviews' &&
      ![
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ].includes(file.type)
    ) {
      alert('Only .xls/.xlsx files are allowed for Client Reviews.');
      return;
    }

    setUploadedFiles((prev) => ({
      ...prev,
      [field]: file,
    }));
  };

  const handleClearFile = (field) => {
    setUploadedFiles((prev) => ({
      ...prev,
      [field]: null,
    }));
  };

  const uploadFile = async (file) => {
    // Get presigned URL for S3 upload
    const { presignedUrl, key } = await getUploadSignature(
      file.name,
      file.type
    );

    // Upload file to S3 using presigned URL
    await uploadToS3(file, presignedUrl);

    // Return the key which will be used to construct the full URL
    return key;
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitted(true);

  if (!providerId) {
    alert('Provider ID not found. Please start from the beginning.');
    navigate('/provider-portal');
    return;
  }

  const { headshot, gallery, reviews } = uploadedFiles;

  if (!headshot || !gallery || !reviews) {
    alert('Please upload all required files before continuing.');
    return;
  }

  setLoading(true);

  try {
    // Upload images to S3 (headshot and gallery only)
    const [headshotKey, galleryKey] = await Promise.all([
      uploadFile(headshot),
      uploadFile(gallery),
    ]);

    console.log('Uploaded S3 keys:', { headshotKey, galleryKey }); // Debug log

    // Save the image URLs to the provider record
    const updatedProvider = await saveImageUrls(providerId, {
      headshotUrl: headshotKey,
      galleryUrl: galleryKey,
    });

    console.log('Updated provider response:', updatedProvider); // Debug log

    // Verify images were saved successfully
    if (!updatedProvider.provider) {
      throw new Error('Failed to save images - no provider data returned');
    }

    const savedProvider = updatedProvider.provider;
    console.log('Saved provider images:', {
      headshotUrl: savedProvider.headshotUrl,
      galleryUrl: savedProvider.galleryUrl
    }); // Debug log

    // Verify the images were actually saved
    if (!savedProvider.headshotUrl || !savedProvider.galleryUrl) {
      throw new Error('Images were not properly saved to provider record');
    }

    // Process the Excel reviews file directly
    try {
      const reviewsResult = await uploadReviewsExcel(providerId, reviews);

      // Show success message with details
      if (reviewsResult.warnings) {
        alert(
          `Files uploaded successfully! ${reviewsResult.reviewsAdded} reviews were processed. ${reviewsResult.warnings.message}`
        );
      } else {
        alert(
          `Files uploaded successfully! ${reviewsResult.reviewsAdded} reviews were processed.`
        );
      }
    } catch (reviewError) {
      console.error('Error processing reviews:', reviewError);
      alert(
        `Images uploaded successfully, but there was an issue processing the reviews file: ${reviewError.message}. Please check the file format and try again.`
      );
    }

    // Send provider signup notification email using the updated provider data
    try {
      console.log('📧 Starting provider signup notification process...');
      
      // Use the updated provider data we just received instead of fetching again
      const providerData = {
        id: providerId,
        name: savedProvider.providerName || 'Name not available',
        email: savedProvider.email || 'Email not available',
        practiceName: savedProvider.practiceName || 'Practice name not available',
        phone: savedProvider.phone || 'Phone not provided',
        specialties: savedProvider.specialties || [],
        address: savedProvider.address || 'Address not provided',
        certifications: savedProvider.boardCertifications || [],
        npiNumber: savedProvider.npiNumber || 'NPI not provided',
        hospitalAffiliations: savedProvider.hospitalAffiliations || [],
        educationAndTraining: savedProvider.educationAndTraining || [],
      };

      console.log('👤 Using updated provider data:', providerData);

      console.log('📤 Calling sendProviderSignupNotification...');
      const notificationResult = await sendProviderSignupNotification(providerData);

      console.log('✅ Provider signup notification sent successfully!');
      console.log('📨 Notification result:', notificationResult);
    } catch (emailError) {
      console.error('❌ Failed to send provider signup notification:', emailError);
      console.warn('⚠️ Continuing with registration process despite email failure');
      // Don't fail the process if email fails
    }

    // Clear the provider ID as the process is complete
    localStorage.removeItem('providerId');

    navigate('/completion');
  } catch (err) {
    console.error('Upload failed:', err);
    alert(`Upload failed: ${err.message}. Please try again.`);
  } finally {
    setLoading(false);
  }
};
  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-white'>
        <div className='text-center'>
          <div className='w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto'></div>
          <p className='mt-4 text-[#061140] font-medium'>
            Uploading your files, please wait...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-white via-white to-[#d9dff4]'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-35 pb-8'>
        <div className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
          <div className='lg:col-span-1'>
            <h1
              style={{ fontFamily: 'Montserrat' }}
              className='text-[40px] font-medium text-[#061140] mb-6'
            >
              Provider Portal Account
            </h1>
            <div className='space-y-4'>
              {[
                'Practice Information',
                'Practitioner Qualifications',
                'Profile Content',
              ].map((title, i) => (
                <div className='flex items-start' key={i}>
                  <div
                    className={`md:border-l-3 border-l-[#7F92E5] md:pl-4 ${
                      i < 2 ? 'hidden md:block' : ''
                    }`}
                  >
                    <h2
                      style={{ fontFamily: 'Montserrat' }}
                      className='font-medium text-[16px] text-[#061140]'
                    >
                      {title}
                    </h2>
                    <p
                      style={{ fontFamily: 'Karla' }}
                      className='text-sm text-[#484848]'
                    >
                      {
                        {
                          0: "Share your practice's name and address details.",
                          1: 'Outline your specialties, certifications, hospital affiliations, and training.',
                          2: 'Customize your profile with a headshot, image gallery, and customer reviews.',
                        }[i]
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className='lg:col-span-2 lg:ml-25'>
            <form
              style={{ fontFamily: 'Karla' }}
              onSubmit={handleSubmit}
              className='space-y-6'
            >
              <StyledFileInput
                label='Professional Headshot'
                subLabel='Image dimensions are 400PX x 400PX (1:1)'
                onChange={(e) =>
                  handleFileSelect('headshot', e.target.files[0])
                }
                onClear={() => handleClearFile('headshot')}
                fileName={uploadedFiles.headshot?.name}
                fileUrl={
                  uploadedFiles.headshot
                    ? URL.createObjectURL(uploadedFiles.headshot)
                    : ''
                }
                Icon={MdOutlineFileUpload}
                accept='.jpg,.jpeg,.png'
                isImage
                submitted={submitted}
              />

              <StyledFileInput
                label='Gallery Photo'
                subLabel='Image dimensions are 700PX x 525PX (4:3)'
                onChange={(e) => handleFileSelect('gallery', e.target.files[0])}
                onClear={() => handleClearFile('gallery')}
                fileName={uploadedFiles.gallery?.name}
                fileUrl={
                  uploadedFiles.gallery
                    ? URL.createObjectURL(uploadedFiles.gallery)
                    : ''
                }
                Icon={MdOutlineFileUpload}
                accept='.jpg,.jpeg,.png'
                isImage
                submitted={submitted}
              />

              <StyledFileInput
                label='Client Reviews'
                subLabel='Import .XLS file. Include Client Name, Review, and Satisfaction rating.'
                onChange={(e) => handleFileSelect('reviews', e.target.files[0])}
                onClear={() => handleClearFile('reviews')}
                fileName={uploadedFiles.reviews?.name}
                Icon={IoMdArrowDown}
                accept='.xls,.xlsx'
                isImage={false}
                submitted={submitted}
              />

              <div className='grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6'>
                <div className='col-span-1'>
                  <button
                    type='button'
                    onClick={() => navigate('/qualifications')}
                    className='w-full sm:w-32 flex justify-center py-4 px-4 md:px-20 border text-[#061140] border-[#7E7E7E] rounded-full shadow-sm text-sm font-medium hover:border-[#162241]'
                  >
                    Back
                  </button>
                </div>
                <div className='col-span-1'>
                  <button
                    type='submit'
                    className='w-full sm:w-32 flex justify-center py-4 px-4 md:px-20 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-[#0C1F6D] hover:bg-[#162241]'
                  >
                    Continue
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileContent;
