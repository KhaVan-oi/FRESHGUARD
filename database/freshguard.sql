-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 25, 2026 at 05:21 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `freshguard`
--

-- --------------------------------------------------------

--
-- Table structure for table `action_logs`
--

CREATE TABLE `action_logs` (
  `id` int(11) NOT NULL,
  `action_type` varchar(255) NOT NULL,
  `action_value` varchar(255) NOT NULL,
  `trigger_source` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `user_id` int(11) DEFAULT NULL,
  `area_id` int(11) DEFAULT NULL,
  `device_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `action_logs`
--

INSERT INTO `action_logs` (`id`, `action_type`, `action_value`, `trigger_source`, `created_at`, `user_id`, `area_id`, `device_id`) VALUES
(1, 'TEMP_ALERT', 'Vượt ngưỡng (Hiện tại: 28)', 'AUTO', '2026-03-25 17:12:50.445603', NULL, 1, 1),
(2, 'MANUAL_CONTROL', 'Người dùng ép lệnh undefined từ Web', 'MANUAL', '2026-03-25 21:41:24.483752', NULL, NULL, 1),
(3, 'MANUAL_CONTROL', 'Người dùng ép lệnh MODE_1 từ Web', 'MANUAL', '2026-03-25 21:42:02.535118', NULL, NULL, 4),
(4, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh OFF từ Web', 'MANUAL', '2026-03-25 22:23:26.734314', NULL, NULL, 1),
(5, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh ON từ Web', 'MANUAL', '2026-03-25 22:26:11.711170', NULL, NULL, 1),
(6, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh ON từ Web', 'MANUAL', '2026-03-25 22:43:50.482010', NULL, NULL, 6),
(7, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh OFF từ Web', 'MANUAL', '2026-03-25 22:43:53.948026', NULL, NULL, 6),
(8, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh ON từ Web', 'MANUAL', '2026-03-25 22:43:56.800668', NULL, NULL, 6),
(9, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh OFF từ Web', 'MANUAL', '2026-03-25 22:44:00.504310', NULL, NULL, 6),
(10, 'TEMP_ALERT', 'Vượt ngưỡng (Hiện tại: 25)', 'AUTO', '2026-03-25 22:47:17.447590', NULL, 1, 1),
(11, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh OFF từ Web', 'MANUAL', '2026-03-25 22:54:19.435378', NULL, NULL, 3),
(12, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh ON từ Web', 'MANUAL', '2026-03-25 22:54:22.950716', NULL, NULL, 3),
(13, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh OFF từ Web', 'MANUAL', '2026-03-25 22:54:25.578072', NULL, NULL, 3),
(14, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh ON từ Web', 'MANUAL', '2026-03-25 22:57:19.783267', NULL, NULL, 4),
(15, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh OFF từ Web', 'MANUAL', '2026-03-25 22:57:33.484450', NULL, NULL, 4),
(16, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh ON từ Web', 'MANUAL', '2026-03-25 22:57:35.001716', NULL, NULL, 5),
(17, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh OFF từ Web', 'MANUAL', '2026-03-25 22:57:52.524288', NULL, NULL, 5),
(18, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh ON từ Web', 'MANUAL', '2026-03-25 23:03:52.476593', NULL, NULL, 3),
(19, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh OFF từ Web', 'MANUAL', '2026-03-25 23:03:54.963517', NULL, NULL, 3),
(20, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh ON từ Web', 'MANUAL', '2026-03-25 23:03:56.976285', NULL, NULL, 4),
(21, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh OFF từ Web', 'MANUAL', '2026-03-25 23:03:58.563774', NULL, NULL, 4),
(22, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh ON từ Web', 'MANUAL', '2026-03-25 23:04:02.904712', NULL, NULL, 5),
(23, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh OFF từ Web', 'MANUAL', '2026-03-25 23:04:04.445976', NULL, NULL, 5),
(24, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh MODE_1 từ Web', 'MANUAL', '2026-03-25 23:06:35.995900', NULL, NULL, 4),
(25, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh MODE_1 từ Web', 'MANUAL', '2026-03-25 23:06:44.626950', NULL, NULL, 4),
(26, 'MANUAL_CONTROL', 'Người dùng điều kiển lệnh MODE_3 từ Web', 'MANUAL', '2026-03-25 23:06:50.245563', NULL, NULL, 4);

-- --------------------------------------------------------

--
-- Table structure for table `areas`
--

CREATE TABLE `areas` (
  `id` int(11) NOT NULL,
  `area_name` varchar(255) NOT NULL,
  `auto_door_timeout_sec` int(11) NOT NULL DEFAULT 30,
  `manual_override_mins` int(11) NOT NULL DEFAULT 30,
  `warehouse_id` int(11) DEFAULT NULL,
  `current_food_type_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `areas`
--

INSERT INTO `areas` (`id`, `area_name`, `auto_door_timeout_sec`, `manual_override_mins`, `warehouse_id`, `current_food_type_id`) VALUES
(1, 'Khu A - Thịt Tươi', 30, 30, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `devices`
--

CREATE TABLE `devices` (
  `id` int(11) NOT NULL,
  `device_code` varchar(255) NOT NULL,
  `device_name` varchar(255) NOT NULL,
  `device_type` varchar(255) NOT NULL,
  `adafruit_feed_key` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'ONLINE',
  `area_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `devices`
--

INSERT INTO `devices` (`id`, `device_code`, `device_name`, `device_type`, `adafruit_feed_key`, `status`, `area_id`) VALUES
(1, 'TEMP_A1', 'Cảm biến Nhiệt độ', 'TEMP', 'nhietdo1', 'ONLINE', 1),
(2, 'HUMI_A1', 'Cảm biến Độ ẩm', 'HUMI', 'doam1', 'ONLINE', 1),
(3, 'FAN_A1', 'Quạt Làm Mát', 'ACTUATOR', 'quat1', 'OFF', 1),
(4, 'LIGHT_A1', 'Đèn Chiếu Sáng', 'ACTUATOR', 'den1', 'MODE_3', 1),
(5, 'MATRIX_A1', 'Đèn Tầng Cảnh Báo', 'ACTUATOR', 'led_matrix', 'OFF', 1),
(6, 'DOOR_A1', 'Cảm biến Cửa (Nút A)', 'DOOR_SENSOR', 'nut_a', 'OFF', 1),
(7, 'SOS_A1', 'Nút Khẩn Cấp (Nút B)', 'EMERGENCY_BTN', 'nut_b', 'ONLINE', 1),
(8, 'CO2_A1', 'Cảm biến CO2 (Ảo)', 'CO2_SENSOR', 'co2_1', 'ONLINE', 1);

-- --------------------------------------------------------

--
-- Table structure for table `food_types`
--

CREATE TABLE `food_types` (
  `id` int(11) NOT NULL,
  `food_name` varchar(255) NOT NULL,
  `min_temp` float NOT NULL,
  `max_temp` float NOT NULL,
  `min_humi` float NOT NULL,
  `max_humi` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `food_types`
--

INSERT INTO `food_types` (`id`, `food_name`, `min_temp`, `max_temp`, `min_humi`, `max_humi`) VALUES
(1, 'Thịt Bò Kobe', -18, -5, 40, 80);

-- --------------------------------------------------------

--
-- Table structure for table `sensor_readings`
--

CREATE TABLE `sensor_readings` (
  `id` int(11) NOT NULL,
  `sensor_type` varchar(255) NOT NULL,
  `reading_value` float NOT NULL,
  `recorded_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `device_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sensor_readings`
--

INSERT INTO `sensor_readings` (`id`, `sensor_type`, `reading_value`, `recorded_at`, `device_id`) VALUES
(1, 'TEMP', 28, '2026-03-25 17:12:50.428202', 1),
(2, 'CO2', 407, '2026-03-25 17:13:00.020523', 8),
(3, 'CO2', 420, '2026-03-25 17:14:00.013516', 8),
(4, 'CO2', 427, '2026-03-25 17:15:00.020013', 8),
(5, 'CO2', 419, '2026-03-25 17:16:00.013321', 8),
(6, 'CO2', 394, '2026-03-25 17:17:00.005963', 8),
(7, 'CO2', 399, '2026-03-25 17:18:00.028865', 8),
(8, 'CO2', 392, '2026-03-25 17:19:00.022282', 8),
(9, 'CO2', 449, '2026-03-25 17:20:00.020410', 8),
(10, 'CO2', 374, '2026-03-25 17:21:00.018661', 8),
(11, 'CO2', 392, '2026-03-25 17:22:00.008989', 8),
(12, 'CO2', 422, '2026-03-25 17:23:00.025783', 8),
(13, 'CO2', 398, '2026-03-25 17:24:00.017459', 8),
(14, 'CO2', 391, '2026-03-25 17:25:00.022448', 8),
(15, 'CO2', 379, '2026-03-25 21:33:00.020203', 8),
(16, 'CO2', 432, '2026-03-25 21:34:00.025188', 8),
(17, 'CO2', 428, '2026-03-25 21:35:00.023955', 8),
(18, 'CO2', 393, '2026-03-25 21:36:00.029243', 8),
(19, 'CO2', 410, '2026-03-25 21:37:00.026621', 8),
(20, 'CO2', 376, '2026-03-25 21:38:00.026458', 8),
(21, 'CO2', 396, '2026-03-25 21:39:00.022084', 8),
(22, 'CO2', 433, '2026-03-25 21:40:00.024417', 8),
(23, 'CO2', 404, '2026-03-25 21:41:00.025744', 8),
(24, 'CO2', 365, '2026-03-25 21:42:00.032342', 8),
(25, 'CO2', 389, '2026-03-25 21:43:00.014465', 8),
(26, 'CO2', 403, '2026-03-25 21:44:00.021258', 8),
(27, 'CO2', 419, '2026-03-25 21:45:00.013059', 8),
(28, 'CO2', 398, '2026-03-25 21:46:00.014663', 8),
(29, 'CO2', 437, '2026-03-25 21:47:00.008367', 8),
(30, 'CO2', 370, '2026-03-25 21:48:00.019885', 8),
(31, 'CO2', 442, '2026-03-25 21:49:00.022425', 8),
(32, 'CO2', 393, '2026-03-25 21:50:00.024129', 8),
(33, 'CO2', 430, '2026-03-25 21:51:00.009741', 8),
(34, 'CO2', 439, '2026-03-25 21:52:00.008728', 8),
(35, 'CO2', 439, '2026-03-25 21:53:00.012533', 8),
(36, 'CO2', 385, '2026-03-25 21:54:00.005476', 8),
(37, 'CO2', 433, '2026-03-25 21:55:00.024525', 8),
(38, 'CO2', 450, '2026-03-25 21:56:00.030586', 8),
(39, 'CO2', 360, '2026-03-25 21:57:00.016681', 8),
(40, 'CO2', 448, '2026-03-25 21:58:00.023978', 8),
(41, 'CO2', 382, '2026-03-25 21:59:00.034650', 8),
(42, 'CO2', 410, '2026-03-25 22:00:00.022624', 8),
(43, 'CO2', 414, '2026-03-25 22:01:00.023042', 8),
(44, 'CO2', 399, '2026-03-25 22:02:00.014942', 8),
(45, 'CO2', 424, '2026-03-25 22:03:00.040644', 8),
(46, 'CO2', 399, '2026-03-25 22:04:00.032910', 8),
(47, 'CO2', 426, '2026-03-25 22:05:00.035709', 8),
(48, 'CO2', 416, '2026-03-25 22:06:00.053267', 8),
(49, 'CO2', 437, '2026-03-25 22:07:00.056562', 8),
(50, 'CO2', 411, '2026-03-25 22:08:00.041790', 8),
(51, 'CO2', 391, '2026-03-25 22:09:00.035674', 8),
(52, 'CO2', 356, '2026-03-25 22:10:00.039115', 8),
(53, 'CO2', 437, '2026-03-25 22:11:00.064811', 8),
(54, 'CO2', 374, '2026-03-25 22:12:00.016852', 8),
(55, 'CO2', 350, '2026-03-25 22:13:00.030723', 8),
(56, 'CO2', 441, '2026-03-25 22:14:00.017611', 8),
(57, 'CO2', 361, '2026-03-25 22:15:00.016851', 8),
(58, 'CO2', 356, '2026-03-25 22:16:00.011358', 8),
(59, 'CO2', 449, '2026-03-25 22:17:00.016238', 8),
(60, 'CO2', 400, '2026-03-25 22:18:00.014151', 8),
(61, 'CO2', 397, '2026-03-25 22:19:00.012962', 8),
(62, 'CO2', 370, '2026-03-25 22:20:00.012794', 8),
(63, 'CO2', 433, '2026-03-25 22:21:00.012878', 8),
(64, 'CO2', 443, '2026-03-25 22:22:00.014518', 8),
(65, 'CO2', 447, '2026-03-25 22:23:00.018234', 8),
(66, 'CO2', 378, '2026-03-25 22:27:00.027834', 8),
(67, 'CO2', 381, '2026-03-25 22:28:00.022926', 8),
(68, 'CO2', 416, '2026-03-25 22:29:00.007090', 8),
(69, 'CO2', 412, '2026-03-25 22:30:00.009166', 8),
(70, 'CO2', 398, '2026-03-25 22:31:00.018323', 8),
(71, 'CO2', 410, '2026-03-25 22:32:00.009607', 8),
(72, 'CO2', 435, '2026-03-25 22:33:00.018651', 8),
(73, 'CO2', 385, '2026-03-25 22:34:00.029645', 8),
(74, 'CO2', 389, '2026-03-25 22:44:00.009210', 8),
(75, 'CO2', 363, '2026-03-25 22:45:00.011112', 8),
(76, 'CO2', 355, '2026-03-25 22:46:00.025634', 8),
(77, 'CO2', 410, '2026-03-25 22:47:00.005499', 8),
(78, 'TEMP', 25, '2026-03-25 22:47:17.441320', 1),
(79, 'CO2', 389, '2026-03-25 22:48:00.008065', 8),
(80, 'CO2', 432, '2026-03-25 22:49:00.012082', 8),
(81, 'CO2', 390, '2026-03-25 22:50:00.018292', 8),
(82, 'CO2', 389, '2026-03-25 22:51:00.007671', 8),
(83, 'CO2', 372, '2026-03-25 22:52:00.016885', 8),
(84, 'CO2', 450, '2026-03-25 22:53:00.004539', 8),
(85, 'CO2', 351, '2026-03-25 22:54:00.013379', 8),
(86, 'CO2', 429, '2026-03-25 22:55:00.029246', 8),
(87, 'CO2', 436, '2026-03-25 22:56:00.005337', 8),
(88, 'HUMI', 40, '2026-03-25 22:56:15.803255', 2),
(89, 'CO2', 384, '2026-03-25 22:57:00.021874', 8),
(90, 'CO2', 414, '2026-03-25 22:58:00.024482', 8),
(91, 'HUMI', 40, '2026-03-25 22:58:57.537698', 2),
(92, 'CO2', 443, '2026-03-25 22:59:00.021031', 8),
(93, 'CO2', 389, '2026-03-25 23:00:00.019919', 8),
(94, 'CO2', 394, '2026-03-25 23:01:00.012525', 8),
(95, 'CO2', 366, '2026-03-25 23:02:00.006734', 8),
(96, 'CO2', 391, '2026-03-25 23:03:00.009208', 8),
(97, 'CO2', 420, '2026-03-25 23:04:00.005578', 8),
(98, 'CO2', 404, '2026-03-25 23:05:00.029045', 8),
(99, 'CO2', 384, '2026-03-25 23:06:00.019209', 8),
(100, 'CO2', 445, '2026-03-25 23:07:00.017253', 8),
(101, 'CO2', 440, '2026-03-25 23:08:00.020298', 8),
(102, 'CO2', 351, '2026-03-25 23:09:00.009839', 8),
(103, 'CO2', 449, '2026-03-25 23:18:00.016530', 8),
(104, 'CO2', 381, '2026-03-25 23:19:00.029730', 8),
(105, 'CO2', 448, '2026-03-25 23:20:00.008656', 8),
(106, 'CO2', 403, '2026-03-25 23:21:00.024286', 8);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(255) NOT NULL DEFAULT 'OPERATOR',
  `full_name` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `role`, `full_name`) VALUES
(1, 'admin', '123456', 'ADMIN', 'Tiến Đạt (Sếp Tổng)'),
(2, 'nhanvien1', '123456', 'OPERATOR', 'Nguyễn Văn A');

-- --------------------------------------------------------

--
-- Table structure for table `user_area_management`
--

CREATE TABLE `user_area_management` (
  `uSERSId` int(11) NOT NULL,
  `aREASId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `warehouses`
--

CREATE TABLE `warehouses` (
  `id` int(11) NOT NULL,
  `warehouse_name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `warehouses`
--

INSERT INTO `warehouses` (`id`, `warehouse_name`) VALUES
(1, 'Kho Lạnh HCMUT');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `action_logs`
--
ALTER TABLE `action_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_1bf562030c7a51c9605e1f45f32` (`user_id`),
  ADD KEY `FK_8e905312e5e7cd4d733f68d55ee` (`area_id`),
  ADD KEY `FK_3503b70486e6d3a9357c23c41d1` (`device_id`);

--
-- Indexes for table `areas`
--
ALTER TABLE `areas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_6c839003276895337c9fb4da7f0` (`warehouse_id`),
  ADD KEY `FK_cb2dc41a1f1c6a868e1d475faf9` (`current_food_type_id`);

--
-- Indexes for table `devices`
--
ALTER TABLE `devices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_5ea581b2efa01ccd29dd4bb219` (`device_code`),
  ADD KEY `FK_4f81d9e267525f4d1e9f4b69d07` (`area_id`);

--
-- Indexes for table `food_types`
--
ALTER TABLE `food_types`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sensor_readings`
--
ALTER TABLE `sensor_readings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_cf99b2693ba85492a07e752db89` (`device_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `user_area_management`
--
ALTER TABLE `user_area_management`
  ADD PRIMARY KEY (`uSERSId`,`aREASId`),
  ADD KEY `IDX_84138365c1f56d1e1d3440378b` (`uSERSId`),
  ADD KEY `IDX_6506b37c52aac6501e3d5d3d94` (`aREASId`);

--
-- Indexes for table `warehouses`
--
ALTER TABLE `warehouses`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `action_logs`
--
ALTER TABLE `action_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `areas`
--
ALTER TABLE `areas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `devices`
--
ALTER TABLE `devices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `food_types`
--
ALTER TABLE `food_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `sensor_readings`
--
ALTER TABLE `sensor_readings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=107;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `warehouses`
--
ALTER TABLE `warehouses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `action_logs`
--
ALTER TABLE `action_logs`
  ADD CONSTRAINT `FK_1bf562030c7a51c9605e1f45f32` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_3503b70486e6d3a9357c23c41d1` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_8e905312e5e7cd4d733f68d55ee` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `areas`
--
ALTER TABLE `areas`
  ADD CONSTRAINT `FK_6c839003276895337c9fb4da7f0` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_cb2dc41a1f1c6a868e1d475faf9` FOREIGN KEY (`current_food_type_id`) REFERENCES `food_types` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `devices`
--
ALTER TABLE `devices`
  ADD CONSTRAINT `FK_4f81d9e267525f4d1e9f4b69d07` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `sensor_readings`
--
ALTER TABLE `sensor_readings`
  ADD CONSTRAINT `FK_cf99b2693ba85492a07e752db89` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
