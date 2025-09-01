"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { GetData } from "../../utils/sessionStoreage"
import { toast } from "react-hot-toast"
import "./userdashboard.css"
import Settings from "./Settings"
import { Modal, Button, Form } from "react-bootstrap"
import Swal from "sweetalert2"
import useLogout from "../../components/useLogout/useLogout"
import CropperModal from "../../Helper/CropperModal.js"

function Dashboard() {
  const [myProfile, setMyProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("settings")
  const [amount, setAmount] = useState("")
  const Data = GetData("user")
  const UserData = JSON.parse(Data)
  const userId = UserData?._id
  const token = GetData("token")
  const [walletAmount, setWalletAmount] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [showCropper, setShowCropper] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // Coupon related states
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState("")

  // console.log("UserData", UserData)
  // console.log("userid", userId)

  const GetMyProfile = async () => {
    if (!token) {
      console.error("Token is missing")
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.get(`https://testapi.dessobuild.com/api/v1/get-single-user/${userId}`)
      // console.log("data: ", data.data)
      setMyProfile(data.data)
      // console.log("object", data)
      const formattedAmount = data.data.walletAmount.toFixed(2)
      setWalletAmount(formattedAmount)
      setLoading(false)
    } catch (error) {
      setLoading(false)
      console.error("Error fetching profile:", error)
    }
  }

  useEffect(() => {
    GetMyProfile()
  }, [])

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    const imageUrl = URL.createObjectURL(file)
    setSelectedImage(imageUrl)
    setShowCropper(true)
  }

  const handleCropComplete = async (blob) => {
    setProfileLoading(true)
    const formData = new FormData()
    formData.append("ProfileImage", blob)
    try {
      const res = await axios.put(`https://testapi.dessobuild.com/api/v1/update_user_profile_image/${userId}`, formData)
      if (res.data.success) {
        setProfileLoading(false)
        toast.success("Image updated successfully")
        setShowCropper(false)
        setSelectedImage(null)
        window.location.reload()
      }
    } catch (error) {
      console.log("Internal server error", error)
    } finally {
      setProfileLoading(false)
    }
  }

  const handleOpenModel = async () => {
    if (!token) {
      // return toast.error('Login First!');
      return Swal.fire({
        title: "Error!",
        text: "Login First!",
        icon: "error", // use lowercase
        confirmButtonText: "Okay",
      })
    } else if (UserData?.role === "provider") {
      // return toast.error(`You are a provider. You don't have access.`);
      return Swal.fire({
        title: "Error!",
        text: `You are a provider. You don't have access.`,
        icon: "error", // use lowercase
        confirmButtonText: "Okay",
      })
    }
    setShowModal(true)
  }

  // Dynamically load the Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const handleCloseModel = () => {
    setShowModal(false)
    setAmount("") // Reset the amount when closing the modal
    setCouponCode("")
    setAppliedCoupon(null)
    setCouponError("")
  }

  const handlePresetAmount = (preset) => {
    setAmount(preset)
  }

  // Function to check coupon
  const handleCheckCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code")
      return
    }

    setCouponLoading(true)
    setCouponError("")

    try {
      const res = await axios.post("https://testapi.dessobuild.com/api/v1/check_coupon", {
        couponCode: couponCode.trim(),
      })

      if (res.data.success) {
        setAppliedCoupon(res.data.data?.couponCode)
        toast.success("Coupon applied successfully!")
      }
    } catch (error) {
      setCouponError(error?.response?.data?.message || "Invalid coupon code")
      setAppliedCoupon(null)
    } finally {
      setCouponLoading(false)
    }
  }

  // Function to remove applied coupon
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode("")
    setCouponError("")
  }

  const handleMakePayment = async () => {
    if (!amount || amount <= 0) {
      // return toast.error('Please enter a valid amount');
      return Swal.fire({
        title: "Error!",
        text: "Please enter a valid amount",
        icon: "error", // use lowercase
        confirmButtonText: "Okay",
      })
    }
    // toast.success(`Proceeding with payment of ₹${amount}`);
    // handleCloseModel();

    try {
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        alert("Failed to load Razorpay SDK. Please check your connection.")
        return
      }

      const UserId = UserData?._id

      // Prepare request body with coupon if applied
      const requestBody = {
        price: amount,
      }

      if (appliedCoupon) {
        requestBody.couponCode = appliedCoupon
      }

      const res = await axios.post(`https://testapi.dessobuild.com/api/v1/create-payment/${UserId}`, requestBody)

      // console.log("Order", res.data.data)
      const order = res.data.data.razorpayOrder
      if (order) {
        const options = {
          key: "rzp_live_bmq7YMRTuGvvfu",
          amount: amount * 100,
          currency: "INR",
          name: "DessoBuild",
          description: "Doing Recharge",
          order_id: order?.id || "",
          callback_url: "https://testapi.dessobuild.com/api/v1/verify-payment",
          prefill: {
            name: UserData?.name,
            email: UserData?.email,
            contact: UserData?.PhoneNumber,
          },
          theme: {
            color: "#F37254",
          },
        }
        const rzp = new window.Razorpay(options)
        rzp.open()
      }
    } catch (error) {
      console.log("Internal server error", error)
      // toast.error(error?.response?.data?.message || 'Failed to Reacharge. Please try again.');
      Swal.fire({
        title: "Error!",
        text: error?.response?.data?.message || "Failed to Reacharge. Please try again.",
        icon: "error", // use lowercase
        confirmButtonText: "Okay",
      })
    }
  }

  // const handleLogout = () => {
  //   localStorage.clear()
  //   window.location.href = '/'
  // }

  const handleLogout = useLogout(userId)

  const handleDeleteAccount = async (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This action will permanently delete your account!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await axios.delete(`https://testapi.dessobuild.com/api/v1/user-delete/${id}`)
          if (res.data.success) {
            Swal.fire("Deleted!", "Your account has been deleted.", "success")
            localStorage.clear()
            window.location.href = "/"
          }
        } catch (error) {
          console.log("Internal server error", error)
          Swal.fire("Error!", "Something went wrong. Please try again.", "error")
        }
      }
    })
  }

  if (token === null) {
    return (
      <div className="container my-5 text-center">
        <div className="w-100">
          <img
            src="https://i.ibb.co/C56bwYQ/401-Error-Unauthorized-pana.png"
            alt="401 Unauthorized"
            className="img-fluid mx-auto d-block mb-4"
            style={{ maxWidth: "80%", height: "auto" }}
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

  if (loading || !myProfile) {
    return
    ;<div
      className="d-flex flex-column justify-content-center align-items-center bg-light"
      style={{ height: "100dvh", textAlign: "center" }}
    >
      <div
        className="spinner-border"
        role="status"
        style={{
          width: "3rem",
          height: "3rem",
          borderColor: "#eab936",
          borderRightColor: "transparent",
        }}
      >
        <span className="visually-hidden">Loading...</span>
      </div>
      <h5 className="fw-semibold mb-1 mt-4" style={{ color: "#eab936" }}>
        Fetching Your Profile...
      </h5>
      <small className="text-muted">Please wait while we prepare your Profile.</small>
    </div>
  }

  return (
    <>
      <div className="userdashboard-body-bg">
        <div className="w-100 px-2 mx-auto py-5 h-100">
          <div className="row d-flex justify-content-center align-items-center h-100">
            <div className="col col-xl-12">
              <div className="card profile-card-header" style={{ borderRadius: 15 }}>
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between">
                    <div>
                      <div style={{ alignItems: "center", display: "flex" }} className=" mb-2">
                        <a>
                          <div style={{ position: "relative" }}>
                            <label htmlFor="profile-upload">
                              <img
                                src={
                                  myProfile?.ProfileImage?.imageUrl ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    myProfile.name || "User",
                                  )}&background=random`
                                }
                                alt="avatar"
                                className="img-fluid object-cover rounded-circle me-3"
                                style={{
                                  width: "80px",
                                  height: "80px",
                                  display: "flex",
                                }}
                              />
                            </label>
                            <input
                              type="file"
                              id="profile-upload"
                              style={{ display: "none" }}
                              accept="image/*"
                              onChange={handleFileChange}
                            />
                            {myProfile?.isVerified && (
                              <span
                                className="badge "
                                style={{
                                  position: "absolute",
                                  top: -11,
                                  left: 52,
                                  background: "white",
                                  borderRadius: "50%",
                                  // border: '1px solid black', // Uncomment if you need this
                                  padding: 5,
                                  boxShadow: "1px 1px 10px #dcdcdc",
                                }}
                              >
                                <i style={{ color: "#ff6100" }} class="ri-vip-crown-fill"></i>
                                {/* <img style={{ width: '80px' }} src={crown || "/placeholder.svg"} alt="" /> */}
                              </span>
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
                        </a>
                        <h3 className="p-0 m-0">{myProfile.name}</h3>
                      </div>
                      <p className="small mb-0">
                        {/* <i className="fas fa-star fa-lg text-warning" />{" "} */}
                        {`${myProfile.email}`}
                        <span className="mx-2">|</span>
                        {`${myProfile.PhoneNumber}`}
                      </p>
                    </div>
                    <div
                      style={{ display: "flex" }}
                      className=" flex-column gap-2 align-items-center justify-content-center"
                    >
                      <div style={{ display: "flex" }} className="architectur-bar">
                        <div className="available-balance medium-device-balance">
                          {" "}
                          Available balance: <main class="balance-avail"> ₹ {walletAmount} </main>
                        </div>
                      </div>
                      <a onClick={handleOpenModel} className="profileRecharge">
                        Recharge
                      </a>
                    </div>
                  </div>
                  <hr className="my-4" />
                  <div className="featured-list d-flex justify-content-start align-items-center">
                    <p
                      onClick={() => setActiveTab("settings")}
                      style={{ fontWeight: "700" }}
                      className="formarginbottommore text-uppercase marginrightmore"
                    >
                      <i className="fas fa-cog me-2" />{" "}
                      <span
                        style={{ cursor: "pointer" }}
                        className={`cursor-pointer ${
                          activeTab === "settings" ? "text-danger fw-bold text-decoration-underline" : ""
                        }`}
                      >
                        settings
                      </span>
                      {/* <span className="ms-3 me-4">|</span> */}
                    </p>
                    {/* <p
                      style={{ fontWeight: '700' }}
                      className="formarginbottommore text-uppercase marginrightmore"
                    >
                      <i className="fas fa-cog me-2" />{' '}
                      <a
                        href='manual-chat'
                        style={{ cursor: 'pointer' }}
                        className={`cursor-pointer ${activeTab === 'settings'
                          ? 'text-danger fw-bold text-decoration-underline'
                          : ''
                          }`}
                      >
                        Manual Chat
                      </a>
                                      </p> */}
                    <button
                      type="button"
                      className="formarginbottommore btn logout_btn mx-2 btn-sm btn-floating"
                      title="Delete Account"
                      onClick={() => handleDeleteAccount(userId)}
                    >
                      Delete Account <i className="fas fa-trash text-body"></i>
                    </button>
                    <button
                      type="button"
                      className="btn logout_btn mx-2 btn-sm btn-floating"
                      title="Logout"
                      onClick={() => handleLogout()}
                    >
                      Logout <i className="fas fa-sign-out-alt text-body"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {activeTab === "settings" && (
            <>
              <div className="w-100 py-4 mt-5 mb-3">
                <h2 className="foraligncenter">
                  <i className="fas fa-user-cog text-dark me-2" />
                  My Settings
                </h2>
                {/* Settings Form */}
                <Settings data={myProfile} />
              </div>
            </>
          )}
        </div>
      </div>

      <Modal show={showModal} onHide={handleCloseModel} centered>
        <Modal.Header closeButton>
          <Modal.Title>Recharge Wallet</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Enter Recharge Amount</Form.Label>
              <Form.Control
                type="number"
                placeholder="Enter amount"
                value={amount}
                style={{ border: "1px solid #CFD4DA" }}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Form.Group>

            <div className="d-flex justify-content-around my-3">
              {[100, 300, 500].map((preset) => (
                <Button key={preset} variant="outline-primary" onClick={() => handlePresetAmount(preset)}>
                  ₹{preset}
                </Button>
              ))}
            </div>

            {/* Coupon Section */}
            <Form.Group className="mb-3">
              <Form.Label>Coupon Code (Optional)</Form.Label>
              <div className="d-flex gap-2">
                <Form.Control
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  style={{ border: "1px solid #CFD4DA" }}
                  onChange={(e) => setCouponCode(e.target.value)}
                  disabled={appliedCoupon !== null}
                />
                {!appliedCoupon ? (
                  <Button
                    variant="outline-success"
                    onClick={handleCheckCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                  >
                    {couponLoading ? "Checking..." : "Apply"}
                  </Button>
                ) : (
                  <Button variant="outline-danger" onClick={handleRemoveCoupon}>
                    Remove
                  </Button>
                )}
              </div>

              {couponError && <div className="text-danger small mt-1">{couponError}</div>}

              {appliedCoupon && (
                <div className="text-success small mt-1">
                  <i className="fas fa-check-circle me-1"></i>
                  Coupon "{appliedCoupon.couponCode}" applied successfully!
                  {appliedCoupon.discountPercentage && <span> ({appliedCoupon.discountPercentage}% discount)</span>}
                </div>
              )}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModel}>
            Close
          </Button>
          <Button
            style={{ backgroundColor: "#E9BB37", border: "1px solid #E9BB37" }}
            variant="primary"
            onClick={handleMakePayment}
          >
            Confirm Recharge
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default Dashboard
