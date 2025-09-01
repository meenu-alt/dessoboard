import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { GetData } from '../../utils/sessionStoreage';
import { useDropzone } from 'react-dropzone';
import Portfolio from './Portfolio';
import UploadGallery from './UploadGallery';
import Settings from './Settings.js';
import './userdashboard.css';
import Wallet from './Wallet.js';
import Withdraw from './Withdraw.js';
import Reviews from '../../components/Reviews.js';
import Swal from 'sweetalert2';
import useLogout from '../../components/useLogout/useLogout.js';
import CropperModal from '../../Helper/CropperModal.js';
import toast from 'react-hot-toast';

const UserDashboard = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [reUploadTrue, setReUploadTrue] = useState(true);
  const [showGalleryUpload, setShowGalleryUpload] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false)
  const [token, setToken] = useState(null);
  const [providerId, setProviderId] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Gallery')
  const [mobileNumber, setMobileNumber] = useState('')
  const [walletAmount, setWalletAmount] = useState(0);
  const [statuses, setStatuses] = useState({
    chatStatus: "",
    callStatus: "",
  });

  // Get token from session storage
  const GetToken = () => {
    const data = GetData('token');
    const user = GetData('user');
    const UserData = JSON.parse(user);
    if (data) {
      setToken(data);
    }
    if (UserData) {
      setProviderId(UserData._id)
    } else {
      // Clear any remaining data and redirect to login
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  const GetMyProfile = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`https://testapi.dessobuild.com/api/v1/get-single-provider/${providerId}`);
      setMyProfile(data.data);
      setMobileNumber(data.data.mobileNumber)
      const formattedAmount = data.data.walletAmount.toFixed(2);
      setWalletAmount(formattedAmount);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error('Error fetching profile:', error);
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  };

  const handleFetchProvider = async () => {
    try {
      const { data } = await axios.get(
        `https://testapi.dessobuild.com/api/v1/get-single-provider/${providerId}`
      );
      const allData = data.data;
      setStatuses({
        chatStatus: allData.chatStatus || '',
        callStatus: allData.callStatus || '',
      });
    } catch (error) {
      console.log('Error fetching provider data', error);
      toast.error('Failed to fetch profile data.');
    }
  };

  const handleToggle = async (statusType) => {
    const updatedStatus = !statuses[statusType];
    const previousStatuses = { ...statuses };
    setStatuses({ ...statuses, [statusType]: updatedStatus });

    try {
      const response = await axios.put(
        `https://testapi.dessobuild.com/api/v1/update-available-status/${providerId}`,
        { [statusType]: updatedStatus }
      );
      if (response.data.success) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: `${response.data.message}`,
        })
      } else {
        Swal.fire({
          title: 'Error!',
          text: 'Failed to update status',
          icon: 'error',
          confirmButtonText: 'Okay'
        });
        setStatuses(previousStatuses);
      }
    } catch (error) {
      console.log('Internal server error', error);
      Swal.fire({
        title: 'Error!',
        text: 'Error updating status',
        icon: 'error',
        confirmButtonText: 'Okay'
      });
      setStatuses(previousStatuses);
    }
  };

  const onDrop = (acceptedFiles) => {
    setFiles([...files, ...acceptedFiles]);
  };
  
  useEffect(() => {
    GetToken();
  }, []);

  useEffect(() => {
    if (token) {
      GetMyProfile();
      handleFetchProvider();
    }
  }, [token]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: '.pdf',
    maxFiles: 5,
    maxSize: 15 * 1024 * 1024,
  });

  const handleUpload = async () => {
    const formData = new FormData();
    files.forEach((file) => formData.append('PortfolioLink', file));

    setUploading(true);

    try {
      const response = await axios.post('https://testapi.dessobuild.com/api/v1/addPortfolio?type=Portfolio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      Swal.fire({
        title: 'Success!',
        text: 'Portfolio uploaded successfully',
        icon: 'success',
        confirmButtonText: 'Okay'
      });
      setUploading(false);
      window.location.reload()
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleIsDeactived = async (id, isDeactived) => {
    try {
      const res = await axios.patch(`https://testapi.dessobuild.com/api/v1/update-provider-deactive-status/${id}`)
      if (res.data.success) {
        toast.success(res.data.message);
        window.location.reload()
      }
    } catch (error) {
      console.log("Internal server error", error)
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setShowCropper(true);
  };

  const handleCropComplete = async (blob) => {
    setProfileLoading(true)
    const formData = new FormData();
    formData.append('photo', blob);
    try {
      const res = await axios.put(`https://testapi.dessobuild.com/api/v1/update_provider_profile_image/${providerId}`, formData)
      if (res.data.success) {
        setProfileLoading(false)
        toast.success('Image updated successfully');
        setShowCropper(false);
        setSelectedImage(null);
        window.location.reload()
      }
    } catch (error) {
      console.log("Internal server error", error)
    } finally {
      setProfileLoading(false)
    }
  };

  const handleLogout = useLogout(providerId);

  const handleDeleteAccount = async (id) => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This action will permanently delete your account!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await axios.delete(`https://testapi.dessobuild.com/api/v1/delete-provider/${id}`)
          if (res.data.success) {
            localStorage.clear()
            window.location.href = '/'
          }
        } catch (error) {
          console.log("Internal server error", error)
        }
      }
    });
  }

  const [amount, setAmount] = useState("");
  const [commission, setCommission] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [commissionPercent, setCommissionPercent] = useState(0)

  const handleFetchCommission = async () => {
    try {
      const { data } = await axios.get('https://testapi.dessobuild.com/api/v1/get-all-commision')
      const commissiondata = data.data
      setCommissionPercent(commissiondata[0]?.commissionPercent)
    } catch (error) {
      console.log("Internale server error", error)
    }
  }

  useEffect(() => {
    handleFetchCommission();
  }, [])

  const handleAmountChange = (e) => {
    const inputAmount = parseFloat(e.target.value) || 0;
    const calculatedCommission = (inputAmount * commissionPercent) / 100;
    const calculatedFinalAmount = inputAmount - calculatedCommission;

    setAmount(e.target.value);
    setCommission(calculatedCommission);
    setFinalAmount(calculatedFinalAmount);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      Swal.fire({
        title: 'Error!',
        text: "Please enter a valid amount.",
        icon: 'error',
        confirmButtonText: 'Okay'
      });
      return;
    }

    if (parseFloat(amount) > walletAmount) {
      Swal.fire({
        title: 'Error!',
        text: "Insufficient wallet balance.",
        icon: 'error',
        confirmButtonText: 'Okay'
      });
      return;
    }

    try {
      const response = await axios.post("https://testapi.dessobuild.com/api/v1/create-withdraw-request", {
        provider: myProfile._id,
        amount: parseFloat(amount),
        commission,
        finalAmount,
        providerWalletAmount: walletAmount,
        commissionPercent: commissionPercent
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setAmount("");
        setCommission(0);
        setFinalAmount(0);
        closeWithdrawModal();
      } else {
        Swal.fire({
          title: 'Error!',
          text: error?.response?.data?.errors?.[0] || error?.response?.data?.message || "Please try again later",
          icon: 'error',
          confirmButtonText: 'Okay'
        });
      }
    } catch (error) {
      console.log("Failed to create withdrawal request. Please try again.", error)
      Swal.fire({
        title: 'Error!',
        text: error?.response?.data?.errors?.[0] || error?.response?.data?.message || "Please try again later",
        icon: 'error',
        confirmButtonText: 'Okay'
      });
    }
  };

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  const sendOtp = async () => {
    try {
      const response = await axios.post('https://testapi.dessobuild.com/api/v1/otp_send_before_update', { mobileNumber });
      if (response.data.success) {
        setOtpSent(true);
        setTimeout(() => {
          document.getElementById('otpModal').style.display = 'block';
        }, 200);
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      alert('Failed to send OTP. Try again.');
    }
  };

  const verifyOtp = async () => {
    try {
      const response = await axios.post('https://testapi.dessobuild.com/api/v1/verify_otp_before_update', { mobileNumber, otp });
      if (response.data.success) {
        setIsOtpVerified(true);
        setActiveTab(3);
        setOtpSent(false);
        setOtp('');
        closeOtpModal();
        setTimeout(() => {
          document.getElementById('withdrawalModal').style.display = 'block';
        }, 200);
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      alert('OTP verification failed.');
    }
  };

  const closeOtpModal = () => {
    document.getElementById('otpModal').style.display = 'none';
  };

  const closeWithdrawModal = () => {
    document.getElementById('withdrawalModal').style.display = 'none';
  };

  if (token === null) {
    return (
      <div className="container my-5 text-center">
        <div className="w-100">
          <img
            src="https://i.ibb.co/C56bwYQ/401-Error-Unauthorized-pana.png"
            alt="401 Unauthorized"
            className="img-fluid mx-auto d-block mb-4"
            style={{ maxWidth: '80%', height: 'auto' }}
          />
        </div>
        <p className="fs-4 text-muted">You are not authorized to view this page.</p>
        <a href="/login" className="btn btn-outline-danger as_btn btn-lg mt-3">
          <i className="fas fa-sign-in-alt me-2"></i>
          Login
        </a>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!myProfile) {
    return (
      <div className="container my-5 text-center">
        <div className="w-100">
          <img
            src="https://i.ibb.co/C56bwYQ/401-Error-Unauthorized-pana.png"
            alt="401 Unauthorized"
            className="img-fluid mx-auto d-block mb-4"
            style={{ maxWidth: '80%', height: 'auto' }}
          />
        </div>
        <p className="fs-4 text-muted">You are not authorized to view this page.</p>
        <a href="/login" className="btn btn-outline-danger as_btn btn-lg mt-3">
          <i className="fas fa-sign-in-alt me-2"></i>
          Login
        </a>
      </div>
    )
  }

  return (
    <div className='userdashboard-body-bg'>
      <div className="container-fluid py-4 px-3 px-md-4">
        {/* Profile Header */}
        <div className="card profile-card-header mb-4">
          <div className="card-body p-4">
            <div className="d-md-flex justify-content-between align-items-start">
              <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center mb-3 mb-md-0">
                <div className="position-relative me-md-3 mb-3 mb-md-0">
                  <label htmlFor="profile-upload" className="cursor-pointer">
                    <img
                      src={myProfile?.photo?.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(myProfile.name || 'User')}&background=random`}
                      alt="avatar"
                      className="img-fluid object-cover rounded-circle"
                      style={{ width: '90px', height: '90px', cursor: 'pointer' }}
                    />
                    <div className="position-absolute bottom-0 end-0 bg-white rounded-circle p-1 shadow-sm">
                      <i className="fas fa-camera text-primary"></i>
                    </div>
                  </label>
                  <input
                    type="file"
                    id="profile-upload"
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  {myProfile?.isVerified && (
                    <span className="badge bg-primary position-absolute top-0 end-0">
                      Verified
                    </span>
                  )}
                </div>
                
                <div className="ms-md-3">
                  <h3 className="mb-1">{myProfile.name}</h3>
                  <p className="text-muted mb-2">
                    <span className="badge bg-light text-dark me-2">{myProfile?.type}</span>
                    <span className="me-2">•</span>
                    {`₹ ${myProfile.pricePerMin}/min`}
                    <span className="mx-2">•</span>
                    {myProfile.language && myProfile.language.slice(0, 2).map((lang, index) => (
                      <span key={index} className="badge bg-light text-dark me-1">
                        {lang}
                      </span>
                    ))}
                    {myProfile.language && myProfile.language.length > 2 && (
                      <span className="badge bg-light text-dark">+{myProfile.language.length - 2}</span>
                    )}
                  </p>
                  
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    <div className="d-flex align-items-center bg-light rounded-pill px-3 py-1">
                      <span className="me-2 small">Chat</span>
                      <div className="form-check form-switch mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          checked={statuses.chatStatus}
                          onChange={() => handleToggle('chatStatus')}
                        />
                      </div>
                    </div>
                    <div className="d-flex align-items-center bg-light rounded-pill px-3 py-1">
                      <span className="me-2 small">Call</span>
                      <div className="form-check form-switch mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          checked={statuses.callStatus}
                          onChange={() => handleToggle('callStatus')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="d-flex flex-column gap-2 align-items-start align-items-md-end">
                <a
                  className="btn btn-warning d-flex align-items-center"
                  href={`https://wa.me/?text=Join%20HelpUBuild%20and%20get%20amazing%20benefits!%20Register%20here:%20https://dessobuild.com/member-registration?ref=${myProfile?.couponCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="fas fa-share me-1"></i> Refer & Earn
                </a>
                
                <div className="d-flex align-items-center bg-light rounded-pill px-3 py-2">
                  <span className="me-2">Balance:</span>
                  <span className="fw-bold text-primary">₹{walletAmount}</span>
                </div>
                
                <button onClick={() => sendOtp()} className="btn btn-outline-primary btn-sm">
                  Withdraw
                </button>
              </div>
            </div>

            <hr className="my-4" />
            
            {/* Navigation Tabs */}
            <div className="d-flex flex-wrap gap-2 gap-md-3">
              {['Gallery', 'Portfolio', 'Withdraw', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-outline-primary'} text-uppercase rounded-pill`}
                  style={{ fontSize: '0.8rem' }}
                >
                  <i className={`fas fa-${tab === 'Gallery' ? 'image' : tab === 'Portfolio' ? 'briefcase' : tab === 'Withdraw' ? 'wallet' : 'cog'} me-1`}></i>
                  {tab}
                </button>
              ))}
              
              <div className="d-flex gap-2 ms-auto">
                <button
                  className="btn btn-outline-danger btn-sm"
                  title="Delete Account"
                  onClick={() => handleDeleteAccount(providerId)}
                >
                  <i className="fas fa-trash me-1"></i> Delete
                </button>
                
                <button
                  className="btn btn-outline-secondary btn-sm"
                  title="Logout"
                  onClick={() => handleLogout()}
                >
                  <i className="fas fa-sign-out-alt me-1"></i> Logout
                </button>
                
                <button
                  className="btn btn-outline-dark btn-sm"
                  title={myProfile?.isDeactived ? "Activate Account" : "Deactivate Account"}
                  onClick={() => handleIsDeactived(providerId, !myProfile.isDeactived)}
                >
                  <i className={`fas ${myProfile.isDeactived ? 'fa-user-check' : 'fa-user-slash'} me-1`}></i>
                  {myProfile.isDeactived ? "Activate" : "Deactivate"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="tab-content">
          {/* Gallery Tab */}
          {activeTab === "Gallery" && (
            <div className="card mb-4">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4 className="mb-0">
                    <i className="fas fa-image text-primary me-2"></i>
                    Your Work Gallery
                  </h4>
                  <button
                    onClick={() => setShowGalleryUpload(!showGalleryUpload)}
                    className="btn btn-primary"
                  >
                    <i className="fas fa-plus me-1"></i>
                    {showGalleryUpload ? 'View Gallery' : 'Add Images'}
                  </button>
                </div>
                
                {showGalleryUpload ? (
                  <UploadGallery isShow={showGalleryUpload} token={token} />
                ) : (
                  <>
                    {myProfile?.portfolio?.GalleryImages?.length > 0 ? (
                      <div className="row g-3">
                        {myProfile.portfolio.GalleryImages.map((image, index) => (
                          <div key={index} className="col-6 col-md-4 col-lg-3">
                            <div className="gallery-item position-relative overflow-hidden rounded" style={{ height: '200px' }}>
                              <img 
                                src={image.url} 
                                alt={`Gallery ${index + 1}`}
                                className="img-fluid w-100 h-100 object-cover"
                              />
                              <div className="position-absolute top-0 end-0 m-2">
                                <span className="badge bg-dark">{index + 1}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <i className="fas fa-image fa-3x text-muted mb-3"></i>
                        <h5 className="text-muted">No images in your gallery yet</h5>
                        <p className="text-muted">Upload images to showcase your work</p>
                        <button
                          onClick={() => setShowGalleryUpload(true)}
                          className="btn btn-primary mt-2"
                        >
                          <i className="fas fa-plus me-1"></i>
                          Add Gallery
                        </button>
                      </div>
                    )}
                  </>
                )}
                
                <div className="mt-5">
                  <Reviews />
                </div>
              </div>
            </div>
          )}

          {/* Portfolio Tab */}
          {activeTab === 'Portfolio' && (
            <div className="card mb-4">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4 className="mb-0">
                    <i className="fas fa-briefcase text-primary me-2"></i>
                    My Portfolio
                  </h4>
                  
                  {myProfile?.portfolio?.PortfolioLink && !reUploadTrue && (
                    <button
                      onClick={() => setReUploadTrue(true)}
                      className="btn btn-outline-primary"
                    >
                      <i className="fas fa-upload me-1"></i>
                      Update Portfolio
                    </button>
                  )}
                </div>
                
                {!reUploadTrue ? (
                  <Portfolio fileUrl={myProfile?.portfolio?.PortfolioLink} />
                ) : (
                  <>
                    <div className="d-flex justify-content-end gap-2 mb-4">
                      <button
                        onClick={() => setReUploadTrue(false)}
                        className="btn btn-outline-secondary"
                        disabled={!myProfile?.portfolio?.PortfolioLink}
                      >
                        <i className="fas fa-eye me-1"></i>
                        View Portfolio
                      </button>
                      <button
                        onClick={handleUpload}
                        className="btn btn-primary"
                        disabled={uploading || files.length === 0}
                      >
                        <i className="fas fa-upload me-1"></i>
                        {uploading ? 'Uploading...' : 'Upload Portfolio'}
                      </button>
                    </div>
                    
                    <div
                      {...getRootProps()}
                      className="dropzone border-dashed rounded-lg p-5 text-center cursor-pointer bg-light"
                    >
                      <input {...getInputProps()} />
                      <i className="fas fa-cloud-upload-alt text-primary fa-3x mb-3"></i>
                      <h5 className="text-muted mb-2">Drag & drop your PDF files here</h5>
                      <p className="text-muted mb-0">or click to browse (Max 5 files, 15MB each)</p>
                    </div>
                    
                    {files.length > 0 && (
                      <div className="mt-4">
                        <h6 className="mb-3">Selected files:</h6>
                        <div className="row">
                          {files.map((file, index) => (
                            <div key={index} className="col-12 col-sm-6 col-md-4 mb-3">
                              <div className="card border-0 shadow-sm h-100">
                                <div className="card-body text-center">
                                  <i className="fas fa-file-pdf text-danger fa-2x mb-2"></i>
                                  <p className="card-text text-truncate">{file.name}</p>
                                  <small className="text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</small>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="card mb-4">
              <div className="card-body">
                <h4 className="mb-4">
                  <i className="fas fa-cog text-primary me-2"></i>
                  Account Settings
                </h4>
                <Settings data={myProfile} />
              </div>
            </div>
          )}

          {/* Withdraw Tab */}
          {activeTab === "Withdraw" && (
            <div className="card mb-4">
              <div className="card-body">
                <h4 className="mb-4">
                  <i className="fas fa-wallet text-primary me-2"></i>
                  Withdrawal History
                </h4>
                <Withdraw data={myProfile} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal Modal */}
      <div
        className="modal fade"
        id="withdrawalModal"
        tabIndex="-1"
        aria-labelledby="withdrawalModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="withdrawalModalLabel">
                Create Withdrawal Request
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={closeWithdrawModal}
              ></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                <div className="mb-3">
                  <label htmlFor="amount" className="form-label">
                    Enter Amount
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="amount"
                    name="amount"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="Enter withdrawal amount"
                  />
                </div>

                <div className="bg-light p-3 rounded mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span>Commission ({commissionPercent}%):</span>
                    <span>₹{commission.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold">
                    <span>Final Amount:</span>
                    <span className="text-primary">₹{finalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeWithdrawModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      {otpSent && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">OTP Verification</h5>
                <button type="button" className="btn-close" onClick={closeOtpModal}></button>
              </div>
              <div className="modal-body">
                <p>An OTP has been sent to your registered mobile number: <strong>{mobileNumber}</strong></p>
                <input
                  type="text"
                  className="form-control mt-2"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeOtpModal}>Cancel</button>
                <button className="btn btn-primary" onClick={verifyOtp}>Verify OTP</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCropper && selectedImage && (
        <CropperModal
          imageSrc={selectedImage}
          onClose={() => setShowCropper(false)}
          onCropComplete={handleCropComplete}
          profileLoading={profileLoading}
        />
      )}
    </div>
  );
};

export default UserDashboard;