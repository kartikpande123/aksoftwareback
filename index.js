import express from "express"
const app = express();
const port = 2002;
import cors from "cors";
// const admin = require("./db/firebaseConfig").firebaseAdmin;
import admin from "./db/firebaseConfig.js";
// Middleware
app.use(express.json());
app.use(
  cors({
    origin: "*", // or better: "http://localhost:3000" for local testing
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "Cache-Control",
    ],
  }),
);

// Firestore setup
// const firestore = admin.firestore();
const db = admin.database();
// const bucket = admin.storage().bucket();


//Admin Login api
app.get("/api/get-admin", async (req, res) => {
  try {
    const snapshot = await db.ref("admin").once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const data = snapshot.val();

    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error("Error fetching admin:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


// POST API - Store contact form submissions
app.post("/api/contact", async (req, res) => {
  try {
    const { name, phone, email, other, services } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    // Phone number validation (basic)
    const phoneRegex = /^[+\d\s\-()]{7,15}$/;
    if (!phoneRegex.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid phone number",
      });
    }

    // Email validation (if provided)
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid email address",
        });
      }
    }

    // Create submission object
    const submission = {
      name: name.trim(),
      phone: phone.trim(),
      email: email && email.trim() ? email.trim() : null,
      other: other && other.trim() ? other.trim() : null,
      services: services || [],
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      status: "pending", // pending, contacted, completed
    };

    // Generate a unique key for the submission
    const submissionRef = db.ref("contacts").push();
    const submissionId = submissionRef.key;

    // Add the ID to the submission object
    submission.id = submissionId;

    // Save to Firebase Realtime Database
    await submissionRef.set(submission);

    console.log(`New contact submission saved with ID: ${submissionId}`);

    res.status(201).json({
      success: true,
      message: "Contact form submitted successfully",
      data: {
        id: submissionId,
        name: submission.name,
        phone: submission.phone,
        email: submission.email,
        timestamp: submission.timestamp,
      },
    });
  } catch (error) {
    console.error("Error saving contact form:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

// GET API - Fetch all contact submissions (admin only - you can add authentication later)
app.get("/api/contacts", async (req, res) => {
  try {
    const snapshot = await db.ref("contacts").once("value");

    if (!snapshot.exists()) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No contacts found",
      });
    }

    const data = snapshot.val();
    
    // Convert object to array
    const contactsArray = Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    }));

    // Sort by timestamp descending (newest first)
    contactsArray.sort((a, b) => b.timestamp - a.timestamp);

    res.status(200).json({
      success: true,
      data: contactsArray,
      count: contactsArray.length,
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// GET API - Fetch single contact submission by ID
app.get("/api/contact/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const snapshot = await db.ref(`contacts/${id}`).once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "Contact submission not found",
      });
    }

    const data = snapshot.val();

    res.status(200).json({
      success: true,
      data: {
        id,
        ...data
      },
    });
  } catch (error) {
    console.error("Error fetching contact:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// PUT API - Update contact submission status (admin only)
app.put("/api/contact/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const contactRef = db.ref(`contacts/${id}`);
    const snapshot = await contactRef.once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "Contact submission not found",
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (notes) updateData.notes = notes;
    updateData.updatedAt = new Date().toISOString();

    await contactRef.update(updateData);

    res.status(200).json({
      success: true,
      message: "Contact submission updated successfully",
    });
  } catch (error) {
    console.error("Error updating contact:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// DELETE API - Delete contact submission (admin only)
app.delete("/api/contact/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const contactRef = db.ref(`contacts/${id}`);
    const snapshot = await contactRef.once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "Contact submission not found",
      });
    }

    await contactRef.remove();

    res.status(200).json({
      success: true,
      message: "Contact submission deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


// POST API - Store student enrollment
app.post("/api/student/enroll", async (req, res) => {
  try {
    const { name, phone, email, course } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    // Phone number validation
    const phoneRegex = /^[+\d\s\-()]{7,15}$/;
    if (!phoneRegex.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid phone number",
      });
    }

    // Email validation (if provided)
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid email address",
        });
      }
    }

    // Course validation
    if (!course) {
      return res.status(400).json({
        success: false,
        message: "Please select a course",
      });
    }

    if (course !== "web" && course !== "android") {
      return res.status(400).json({
        success: false,
        message: "Invalid course selection",
      });
    }

    // Course details mapping
    const courseDetails = {
      web: {
        name: "Full Stack Web Development",
        duration: "3 Months",
        price: "15,000",
      },
      android: {
        name: "Full Stack Android Development",
        duration: "3 Months",
        price: "20,000",
      },
    };

    // Create enrollment object
    const enrollment = {
      id: null, // Will be set after push
      name: name.trim(),
      phone: phone.trim(),
      email: email && email.trim() ? email.trim() : null,
      course: course,
      courseName: courseDetails[course].name,
      courseDuration: courseDetails[course].duration,
      coursePrice: courseDetails[course].price,
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      status: "pending", // pending, contacted, enrolled, completed
    };

    // Generate a unique key for the enrollment
    const enrollmentRef = db.ref("studentrequests").push();
    const enrollmentId = enrollmentRef.key;
    enrollment.id = enrollmentId;

    // Save to Firebase Realtime Database
    await enrollmentRef.set(enrollment);

    console.log(`New student enrollment saved with ID: ${enrollmentId}`);

    res.status(201).json({
      success: true,
      message: "Enrollment submitted successfully",
      data: {
        id: enrollmentId,
        name: enrollment.name,
        phone: enrollment.phone,
        course: enrollment.courseName,
        timestamp: enrollment.timestamp,
      },
    });
  } catch (error) {
    console.error("Error saving student enrollment:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

// GET API - Fetch all student enrollments (admin only)
app.get("/api/student/enrollments", async (req, res) => {
  try {
    const snapshot = await db.ref("studentrequests").once("value");

    if (!snapshot.exists()) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No student enrollments found",
      });
    }

    const data = snapshot.val();

    // Convert object to array
    const enrollmentsArray = Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    }));

    // Sort by timestamp descending (newest first)
    enrollmentsArray.sort((a, b) => b.timestamp - a.timestamp);

    res.status(200).json({
      success: true,
      data: enrollmentsArray,
      count: enrollmentsArray.length,
    });
  } catch (error) {
    console.error("Error fetching student enrollments:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// GET API - Fetch single student enrollment by ID
app.get("/api/student/enrollment/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const snapshot = await db.ref(`studentrequests/${id}`).once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "Student enrollment not found",
      });
    }

    const data = snapshot.val();

    res.status(200).json({
      success: true,
      data: {
        id,
        ...data
      },
    });
  } catch (error) {
    console.error("Error fetching student enrollment:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// PUT API - Update student enrollment status (admin only)
app.put("/api/student/enrollment/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const enrollmentRef = db.ref(`studentrequests/${id}`);
    const snapshot = await enrollmentRef.once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "Student enrollment not found",
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (notes) updateData.notes = notes;
    updateData.updatedAt = new Date().toISOString();

    await enrollmentRef.update(updateData);

    res.status(200).json({
      success: true,
      message: "Student enrollment updated successfully",
    });
  } catch (error) {
    console.error("Error updating student enrollment:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// DELETE API - Delete student enrollment (admin only)
app.delete("/api/student/enrollment/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const enrollmentRef = db.ref(`studentrequests/${id}`);
    const snapshot = await enrollmentRef.once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "Student enrollment not found",
      });
    }

    await enrollmentRef.remove();

    res.status(200).json({
      success: true,
      message: "Student enrollment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting student enrollment:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});



app.listen(port, () => {
    console.log(`Port started on http://localhost:${port}`);
});