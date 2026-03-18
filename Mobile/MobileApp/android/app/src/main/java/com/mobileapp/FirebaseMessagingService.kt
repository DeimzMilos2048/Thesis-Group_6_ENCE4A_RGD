package com.mobileapp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class FirebaseMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        
        // Handle the message
        handleNotification(remoteMessage)
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Send the new token to your server
        println("FCM Token refreshed: $token")
    }

    private fun handleNotification(remoteMessage: RemoteMessage) {
        val title = remoteMessage.notification?.title ?: "MALA Notification"
        val body = remoteMessage.notification?.body ?: "New notification received"
        
        // Extract sensor data if available
        val sensorData = remoteMessage.data["sensorData"]
        val fullBody = if (sensorData != null) {
            "$body\n\nSensor Data: $sensorData"
        } else {
            body
        }

        // Create notification channel for Android 8.0+
        createNotificationChannel()
        
        // Build and show the notification
        val notificationBuilder = NotificationCompat.Builder(this, "mala_notifications")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(fullBody))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        val notificationManager = NotificationManagerCompat.from(this)
        notificationManager.notify(System.currentTimeMillis().toInt(), notificationBuilder.build())
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "MALA Notifications"
            val descriptionText = "Notifications from MALA application"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel("mala_notifications", name, importance).apply {
                description = descriptionText
            }

            val notificationManager: NotificationManager =
                getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
}
