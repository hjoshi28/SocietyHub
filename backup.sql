-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: society_db
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `amenities`
--

DROP TABLE IF EXISTS `amenities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `amenities` (
  `amenity_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `hourly_cost` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`amenity_id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `amenities`
--

LOCK TABLES `amenities` WRITE;
/*!40000 ALTER TABLE `amenities` DISABLE KEYS */;
INSERT INTO `amenities` VALUES (1,'Clubhouse',500.00),(2,'Swimming Pool',100.00);
/*!40000 ALTER TABLE `amenities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `amenity_bookings`
--

DROP TABLE IF EXISTS `amenity_bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `amenity_bookings` (
  `booking_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `amenity_id` int NOT NULL,
  `start_time` timestamp NOT NULL,
  `end_time` timestamp NOT NULL,
  `total_cost` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`booking_id`),
  KEY `user_id` (`user_id`),
  KEY `amenity_id` (`amenity_id`),
  CONSTRAINT `amenity_bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `amenity_bookings_ibfk_2` FOREIGN KEY (`amenity_id`) REFERENCES `amenities` (`amenity_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `amenity_bookings`
--

LOCK TABLES `amenity_bookings` WRITE;
/*!40000 ALTER TABLE `amenity_bookings` DISABLE KEYS */;
INSERT INTO `amenity_bookings` VALUES (1,2,2,'2025-11-07 12:45:01','2025-11-07 14:45:01',100.00),(2,2,1,'2025-11-09 12:45:01','2025-11-09 13:45:01',500.00),(3,1,2,'2025-11-10 12:45:01','2025-11-10 14:45:01',0.00);
/*!40000 ALTER TABLE `amenity_bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `announcements`
--

DROP TABLE IF EXISTS `announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcements` (
  `announcement_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `created_by_user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`announcement_id`),
  KEY `created_by_user_id` (`created_by_user_id`),
  CONSTRAINT `announcements_ibfk_1` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `announcements`
--

LOCK TABLES `announcements` WRITE;
/*!40000 ALTER TABLE `announcements` DISABLE KEYS */;
INSERT INTO `announcements` VALUES (1,'Diwali Celebration','Join us for the annual Diwali party in the clubhouse on the 20th!',1,'2025-11-08 12:45:01'),(2,'Pool Maintenance','The swimming pool will be closed for maintenance this Friday.',1,'2025-11-08 12:45:01');
/*!40000 ALTER TABLE `announcements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `log_timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `action_type` varchar(50) NOT NULL,
  `related_bill_id` int DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
INSERT INTO `audit_log` VALUES (1,'2025-11-08 13:13:07','BILL_PAID',2,'Bill #2 for ?500.00 was approved and marked as Paid.');
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `complaints`
--

DROP TABLE IF EXISTS `complaints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `complaints` (
  `complaint_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `flat_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `status` enum('Pending','In Progress','Resolved') NOT NULL DEFAULT 'Pending',
  `assigned_to_staff_user_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`complaint_id`),
  KEY `user_id` (`user_id`),
  KEY `flat_id` (`flat_id`),
  KEY `assigned_to_staff_user_id` (`assigned_to_staff_user_id`),
  CONSTRAINT `complaints_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `complaints_ibfk_2` FOREIGN KEY (`flat_id`) REFERENCES `flats` (`flat_id`) ON DELETE CASCADE,
  CONSTRAINT `complaints_ibfk_3` FOREIGN KEY (`assigned_to_staff_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `complaints`
--

LOCK TABLES `complaints` WRITE;
/*!40000 ALTER TABLE `complaints` DISABLE KEYS */;
INSERT INTO `complaints` VALUES (1,2,101,'Leaky Faucet','Kitchen sink is dripping.','Resolved',4,'2025-11-01 12:45:01'),(2,6,102,'Hallway Light Out','Light near my door is out.','Pending',NULL,'2025-11-04 12:45:01'),(3,2,101,'Loud Music','Loud music from B-101.','In Progress',3,'2025-11-07 12:45:01');
/*!40000 ALTER TABLE `complaints` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flat_residents`
--

DROP TABLE IF EXISTS `flat_residents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `flat_residents` (
  `flat_resident_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `flat_id` int NOT NULL,
  `relationship` enum('Owner','Tenant') NOT NULL,
  PRIMARY KEY (`flat_resident_id`),
  KEY `user_id` (`user_id`),
  KEY `flat_id` (`flat_id`),
  CONSTRAINT `flat_residents_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `flat_residents_ibfk_2` FOREIGN KEY (`flat_id`) REFERENCES `flats` (`flat_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flat_residents`
--

LOCK TABLES `flat_residents` WRITE;
/*!40000 ALTER TABLE `flat_residents` DISABLE KEYS */;
INSERT INTO `flat_residents` VALUES (1,2,101,'Owner'),(2,6,102,'Tenant'),(3,5,201,'Owner');
/*!40000 ALTER TABLE `flat_residents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flats`
--

DROP TABLE IF EXISTS `flats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `flats` (
  `flat_id` int NOT NULL AUTO_INCREMENT,
  `wing` varchar(10) NOT NULL,
  `flat_number` int NOT NULL,
  `sq_footage` int DEFAULT NULL,
  PRIMARY KEY (`flat_id`),
  UNIQUE KEY `wing` (`wing`,`flat_number`)
) ENGINE=InnoDB AUTO_INCREMENT=203 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flats`
--

LOCK TABLES `flats` WRITE;
/*!40000 ALTER TABLE `flats` DISABLE KEYS */;
INSERT INTO `flats` VALUES (101,'A',101,1200),(102,'A',102,1100),(201,'B',101,1500),(202,'B',102,1200);
/*!40000 ALTER TABLE `flats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_bills`
--

DROP TABLE IF EXISTS `maintenance_bills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_bills` (
  `bill_id` int NOT NULL AUTO_INCREMENT,
  `flat_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` varchar(255) DEFAULT 'Standard Maintenance',
  `due_date` date NOT NULL,
  `status` enum('Paid','Unpaid') NOT NULL DEFAULT 'Unpaid',
  `generated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`bill_id`),
  KEY `flat_id` (`flat_id`),
  CONSTRAINT `maintenance_bills_ibfk_1` FOREIGN KEY (`flat_id`) REFERENCES `flats` (`flat_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_bills`
--

LOCK TABLES `maintenance_bills` WRITE;
/*!40000 ALTER TABLE `maintenance_bills` DISABLE KEYS */;
INSERT INTO `maintenance_bills` VALUES (1,101,2500.00,'Standard Maintenance','2025-10-08','Paid','2025-09-29 12:45:01'),(2,101,500.00,'Fine: Improper Garbage Disposal','2025-11-03','Paid','2025-10-29 12:45:01'),(3,101,2500.00,'Standard Maintenance','2025-11-18','Unpaid','2025-11-07 12:45:01'),(4,102,2500.00,'Standard Maintenance','2025-10-08','Unpaid','2025-09-29 12:45:01');
/*!40000 ALTER TABLE `maintenance_bills` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_after_bill_update` AFTER UPDATE ON `maintenance_bills` FOR EACH ROW BEGIN
    
    
    
    IF (OLD.status != 'Paid' AND NEW.status = 'Paid') THEN
        
        
        INSERT INTO audit_log (action_type, related_bill_id, description)
        VALUES (
            'BILL_PAID', 
            NEW.bill_id,
            CONCAT('Bill #', NEW.bill_id, ' for ?', NEW.amount, ' was approved and marked as Paid.')
        );

    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `parking_slots`
--

DROP TABLE IF EXISTS `parking_slots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parking_slots` (
  `slot_id` int NOT NULL AUTO_INCREMENT,
  `slot_number` varchar(20) NOT NULL,
  `status` enum('Available','Assigned') NOT NULL DEFAULT 'Available',
  `is_covered` tinyint(1) DEFAULT '0',
  `assigned_to_user_id` int DEFAULT NULL,
  PRIMARY KEY (`slot_id`),
  UNIQUE KEY `slot_number` (`slot_number`),
  UNIQUE KEY `unique_user_assignment` (`assigned_to_user_id`),
  CONSTRAINT `fk_user_assignment` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parking_slots`
--

LOCK TABLES `parking_slots` WRITE;
/*!40000 ALTER TABLE `parking_slots` DISABLE KEYS */;
INSERT INTO `parking_slots` VALUES (1,'P-A-01','Assigned',1,2),(2,'P-A-02','Available',1,NULL);
/*!40000 ALTER TABLE `parking_slots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_details`
--

DROP TABLE IF EXISTS `staff_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_details` (
  `user_id` int NOT NULL,
  `specialty` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`user_id`),
  CONSTRAINT `staff_details_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_details`
--

LOCK TABLES `staff_details` WRITE;
/*!40000 ALTER TABLE `staff_details` DISABLE KEYS */;
INSERT INTO `staff_details` VALUES (3,'Security',1),(4,'Plumber',1);
/*!40000 ALTER TABLE `staff_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(15) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','resident','staff') NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Admin User','admin@society.com','9000000001','$2a$10$PFT2E0kV4tG9.X6mwJE6uutqnBm2RHHLqi5W0hn0b.lSw8UXSVaca','admin',1,'2025-11-08 12:45:01'),(2,'Resident One','resident@society.com','1234567890','$2a$10$PFT2E0kV4tG9.X6mwJE6uutqnBm2RHHLqi5W0hn0b.lSw8UXSVaca','resident',1,'2025-11-08 12:45:01'),(3,'Security Guard','security@society.com','9000000003','$2a$10$PFT2E0kV4tG9.X6mwJE6uutqnBm2RHHLqi5W0hn0b.lSw8UXSVaca','staff',1,'2025-11-08 12:45:01'),(4,'Plumber Staff','plumber@society.com','9000000004','$2a$10$PFT2E0kV4tG9.X6mwJE6uutqnBm2RHHLqi5W0hn0b.lSw8UXSVaca','staff',1,'2025-11-08 12:45:01'),(5,'New Resident','new@society.com','9000000005','$2a$10$PFT2E0kV4tG9.X6mwJE6uutqnBm2RHHLqi5W0hn0b.lSw8UXSVaca','resident',1,'2025-11-08 12:45:01'),(6,'Deactivated User','deact@society.com','9000000006','$2a$10$PFT2E0kV4tG9.X6mwJE6uutqnBm2RHHLqi5W0hn0b.lSw8UXSVaca','resident',0,'2025-11-08 12:45:01');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicles`
--

DROP TABLE IF EXISTS `vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicles` (
  `vehicle_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `vehicle_number` varchar(20) NOT NULL,
  `vehicle_type` enum('Car','Bike') NOT NULL,
  PRIMARY KEY (`vehicle_id`),
  UNIQUE KEY `vehicle_number` (`vehicle_number`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `vehicles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicles`
--

LOCK TABLES `vehicles` WRITE;
/*!40000 ALTER TABLE `vehicles` DISABLE KEYS */;
INSERT INTO `vehicles` VALUES (1,2,'DL01AB1234','Car');
/*!40000 ALTER TABLE `vehicles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `visitors`
--

DROP TABLE IF EXISTS `visitors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `visitors` (
  `visitor_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `phone` varchar(15) NOT NULL,
  `expected_check_in` timestamp NULL DEFAULT NULL,
  `flat_id` int NOT NULL,
  `actual_check_in` timestamp NULL DEFAULT NULL,
  `actual_check_out` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`visitor_id`),
  KEY `flat_id` (`flat_id`),
  CONSTRAINT `visitors_ibfk_1` FOREIGN KEY (`flat_id`) REFERENCES `flats` (`flat_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `visitors`
--

LOCK TABLES `visitors` WRITE;
/*!40000 ALTER TABLE `visitors` DISABLE KEYS */;
INSERT INTO `visitors` VALUES (1,'Guest One','9876543210','2025-11-08 14:45:01',101,NULL,NULL),(2,'Guest Two (Delivery)','9876543211','2025-11-08 11:45:01',101,'2025-11-08 12:15:01',NULL),(3,'Guest Three (Past)','9876543212','2025-11-07 12:45:01',101,'2025-11-07 12:45:01','2025-11-07 14:45:01');
/*!40000 ALTER TABLE `visitors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'society_db'
--
/*!50106 SET @save_time_zone= @@TIME_ZONE */ ;
/*!50106 DROP EVENT IF EXISTS `evt_monthly_bill_generation` */;
DELIMITER ;;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;;
/*!50003 SET character_set_client  = cp850 */ ;;
/*!50003 SET character_set_results = cp850 */ ;;
/*!50003 SET collation_connection  = cp850_general_ci */ ;;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;;
/*!50003 SET @saved_time_zone      = @@time_zone */ ;;
/*!50003 SET time_zone             = 'SYSTEM' */ ;;
/*!50106 CREATE*/ /*!50117 DEFINER=`root`@`localhost`*/ /*!50106 EVENT `evt_monthly_bill_generation` ON SCHEDULE EVERY 1 MONTH STARTS '2025-12-05 02:00:00' ON COMPLETION NOT PRESERVE ENABLE DO BEGIN
    INSERT INTO maintenance_bills 
        (flat_id, amount, description, due_date, status)
    SELECT 
        flat_id, 
        2500.00,
        'Standard Maintenance', 
        (CURDATE() + INTERVAL 15 DAY),
        'Unpaid'
    FROM 
        flats;
END */ ;;
/*!50003 SET time_zone             = @saved_time_zone */ ;;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;;
/*!50003 SET character_set_client  = @saved_cs_client */ ;;
/*!50003 SET character_set_results = @saved_cs_results */ ;;
/*!50003 SET collation_connection  = @saved_col_connection */ ;;
DELIMITER ;
/*!50106 SET TIME_ZONE= @save_time_zone */ ;

--
-- Dumping routines for database 'society_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-08 21:22:45
