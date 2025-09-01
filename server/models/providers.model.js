const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const ProviderProfileSchema = new mongoose.Schema({
    name: {
        type: String,
        // required: true,
        trim: true
    },
    email: {
        type: String,
        // required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true
    },
    newPassword: {
        type: String
    },
    photo: {
        imageUrl: {
            type: String
        },
        public_id: String
    },

    age: {
        type: Number,
        min: 0
    },
    DOB: {
        type: Date
    },
    language: {
        type: [String],
        default: []
    },
    mobileNumber: {
        type: String,
        unique: true
    },
    adhaarCard: {
        imageUrl: {
            type: String
        },
        public_id: String
    },
    panCard: {
        imageUrl: {
            type: String
        },
        public_id: String
    },
    gstDetails: {
        type: String,
        default: null
    },
    coaNumber: {
        type: String
    },
    qualificationProof: {
        imageUrl: {
            type: String
        },
        public_id: String
    },
    portfolio: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Portfolio'
    },
    expertiseSpecialization: {
        type: [String],
        default: []
    },
    gallery: [
        {
            imageUrl: {
                type: String
            },
            public_id: String
        }
    ],
    location: {
        state: {
            type: String
        },
        city: {
            type: String
        },
        pincode: {
            type: String
        },
        formatted_address: {
            type: String
        }
    },
    role: {
        type: String,
        default: 'provider'
    },
    type: {
        type: String,
        enum: ["Architect", "Interior", "Vastu"],
        required: true
    },
    unique_id: {
        type: String,
        unique: true
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    isProfileComplete: {
        type: Boolean,
        default: false
    },
    resetPasswordOtp: {
        type: String,
    },
    resetPasswordExpiresAt: {
        type: Date,
    },
    averageRating: {
        type: Number
    },
    pricePerMin: {
        type: Number,
        default: 0
    },
    roomId: {
        type: String
    },
    bio: {
        type: String
    },
    yearOfExperience: {
        type: Number
    },
    chatStatus: {
        type: Boolean,
        default: false
    },
    callStatus: {
        type: Boolean,
        default: false
    },
    meetStatus: {
        type: Boolean,
        default: false
    },
    walletAmount: {
        type: Number,
        default: 0
    },
    lastChatTransitionId: {
        type: String
    },
    chatTransition: [{
        startChatTime: { type: String },
        endingChatTime: { type: String },
        startingChatAmount: { type: Number },
        providerPricePerMin: { type: Number },
        chatTimingRemaining: { type: Number },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        deductionAmount: { type: Number },
        Date: { type: Date, default: Date.now },
    },],
    bankDetail: {
        accountHolderName: {
            type: String,
        },
        bankName: {
            type: String,
        },
        accountNumber: {
            type: String,
            validate: {
                validator: function (v) {
                    return /^\d{9,18}$/.test(v); // Ensures the account number is numeric and 9–18 digits long
                },
                message: props => `${props.value} is not a valid account number!`,
            },
        },
        ifscCode: {
            type: String,
            validate: {
                validator: function (v) {
                    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v); // Standard IFSC code format
                },
                message: props => `${props.value} is not a valid IFSC code!`,
            },
        },
        branchName: {
            type: String,
        },
        panCardNumber: {
            type: String,
            validate: {
                validator: function (v) {
                    return /^[A-Z]{5}\d{4}[A-Z]{1}$/.test(v); // Standard PAN card format
                },
                message: props => `${props.value} is not a valid PAN card number!`,
            },
        }
    },
    service: [
        {
            name: {
                type: String,
            },
            price: {
                type: Number,
            }
        }
    ],
    accountVerified: {
        type: String,
        default: 'Pending',
        enum: ['Pending', 'Verified', 'Rejected']
    },
    verificationRejectReason: {
        type: String,
    },
    is_on_call: {
        type: Boolean,
        default: false
    },
    is_on_meet: {
        type: Boolean,
        default: false
    },
    is_on_chat: {
        type: Boolean,
        default: false
    },
    couponCode: {
        type: String
    },
    discount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GlobelUserRefDis",
    },
    referralIsActive: {
        type: Boolean,
        default: true
    },
    isMember: {
        type: Boolean,
        default: false
    },
    memberShip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MemberShip",
    },
    razorpayOrderId: {
        type: String
    },
    transactionId: {
        type: String
    },
    PaymentStatus: {
        type: String,
        default: 'pending',
        enum: ['pending', 'success', 'failed']
    },
    paymentMethod: {
        type: String
    },
    updateOtp: {
        type: String
    },
    updateOtpExpiresAt: {
        type: Date
    },
    providerService: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProviderService'
    },
    changeNumberOtp: {
        type: String
    },
    changeNumberOtpExpiresAt: {
        type: Date
    },
    isDeactived: {
        type: Boolean,
        default: false
    },
    chatRoomIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ChatAndPayment' }],
    termAndCondition: {
        type: Boolean,
        default: false
    },
    nda: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    isHelpuBuildVerified: {
        type: Boolean,
        default: false
    }
});

// Password hashing
ProviderProfileSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});
ProviderProfileSchema.pre("save", async function (next) {
  if (this.unique_id) return next();

  let prefix = "";

  switch (this.type) {
    case "Architect":
      prefix = "DBA";
      break;
    case "Interior":
      prefix = "DBI";
      break;
    case "Vastu":
      prefix = "DBV";
      break;
    default:
      return next(new Error("Invalid type for ID prefix."));
  }

  const Provider = mongoose.model("Provider");

  let attempt = 0;
  const maxAttempts = 10;

  while (attempt < maxAttempts) {
    const count = await Provider.countDocuments({ unique_id: new RegExp(`^${prefix}`) });
    const paddedNumber = String(count + 1 + attempt).padStart(4, "0");
    const generatedId = `${prefix}${paddedNumber}`;

    const existing = await Provider.findOne({ unique_id: generatedId });
    if (!existing) {
      this.unique_id = generatedId;
      return next();
    }

    attempt++;
  }

  return next(new Error("Failed to generate unique ID after multiple attempts."));
});
// Method to check password validity
ProviderProfileSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Provider', ProviderProfileSchema);
