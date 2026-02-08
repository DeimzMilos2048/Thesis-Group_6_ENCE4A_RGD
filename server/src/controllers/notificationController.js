import admin from "../config/firebase.js";
import User from "../models/userModel.js";

const sendNotification = async (userId, title, body, message) => {
  try {
    const user = await User.findById(userId);

    const tokens = user.map(user => user,fcmToken);

    const message ={
      notification: {
        title,
        body
      },
      tokens
    };

    await admin.messaging().sendEachForMulticast(message);

  } catch (error) {
    console.log(error);
  }
};

export default sendNotification;