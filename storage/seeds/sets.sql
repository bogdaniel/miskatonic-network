-- phpMyAdmin SQL Dump
-- version 4.0.10deb1
-- http://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: Oct 13, 2015 at 07:44 PM
-- Server version: 5.5.44-0ubuntu0.14.04.1
-- PHP Version: 5.5.9-1ubuntu4.13

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `miskatonic-network`
--

--
-- Dumping data for table `sets`
--

INSERT INTO `sets` (`id`, `title`, `parent`, `card_number`, `released_at`) VALUES
(1, 'Core Set', NULL, 165, '2008-01-01'),
(2, 'The Thing from the Shore', 'The Summons of the Deep', 20, '2009-01-01'),
(3, 'The Path to Y''ha-nthlei', 'The Summons of the Deep', 20, '2009-01-01'),
(4, 'The Terror of the Tides', 'The Summons of the Deep', 20, '2009-01-01'),
(5, 'Whispers in the Dark', 'The Yuggoth Contract', 20, '2010-01-01'),
(6, 'Murmurs of Evil', 'The Yuggoth Contract', 20, '2010-01-01'),
(7, 'The Spoken Covenant', 'The Yuggoth Contract', 20, '2010-01-01'),
(8, 'Secrets of Arkham', NULL, 60, '2010-01-01'),
(9, 'Ancient Horrors', 'Forgotten Lore', 20, '2008-01-01'),
(10, 'Journey to Unknown Kadath', 'The Dreamlands', 20, '2010-01-01'),
(11, 'At the Mountains of Madness', 'Forgotten Lore', 20, '2008-01-01'),
(12, 'Search for the Silver Key', 'The Dreamlands', 20, '2009-01-01'),
(13, 'Sleep of the Dead', 'The Dreamlands', 20, '2009-01-01'),
(14, 'The Spawn of the Sleeper', 'The Summons of the Deep', 20, '2009-01-01'),
(15, 'Twilight Horror', 'The Dreamlands', 20, '2009-01-01'),
(16, 'In Memory of Day', 'The Dreamlands', 20, '2009-01-01'),
(17, 'In the Dread of Night', 'The Dreamlands', 20, '2009-01-01'),
(18, 'The Antediluvian Dreams', 'The Summons of the Deep', 20, '2009-01-01'),
(19, 'The Horror Beneath the Surface', 'The Summons of the Deep', 20, '2009-01-01'),
(20, 'The Wailer Below', 'The Yuggoth Contract', 20, '2010-01-01'),
(21, 'Screams from Within', 'The Yuggoth Contract', 20, '2010-01-01'),
(22, 'The Cacophony', 'The Yuggoth Contract', 20, '2010-01-01'),
(23, 'The Order of the Silver Twilight', NULL, 55, '2010-01-01'),
(24, 'The Twilight Beckons', 'The Rituals of the Order', 20, '2011-01-01'),
(25, 'Perilous Trials', 'The Rituals of the Order', 20, '2011-01-01'),
(26, 'Initiations of the Favored', 'The Rituals of the Order', 20, '2011-01-01'),
(27, 'Aspirations of Ascension', 'The Rituals of the Order', 20, '2011-01-01'),
(28, 'Spawn of Madness', 'Forgotten Lore', 20, '2011-01-01'),
(29, 'The Gleaming Spiral', 'The Rituals of the Order', 20, '2011-01-01'),
(30, 'That Which Consumes', 'The Rituals of the Order', 20, '2011-01-01'),
(31, 'The Shifting Sands', 'Ancient Relics', 28, '2011-01-01'),
(32, 'Kingsport Dreams', 'Forgotten Lore', 20, '2011-01-01'),
(33, 'Curse of the Jade Emperor', 'Ancient Relics', 20, '2011-01-01'),
(34, 'Conspiracies of Chaos', 'Forgotten Lore', 20, '2011-01-01'),
(35, 'The Breathing Jungle', 'Ancient Relics', 20, '2011-01-01'),
(36, 'Dunwich Denizens', 'Forgotten Lore', 20, '2011-01-01'),
(37, 'Never Night', 'Ancient Relics', 20, '2011-01-01'),
(38, 'Into Tartarus', 'Ancient Relics', 20, '2011-01-01'),
(39, 'Shadow of the Monolith', 'Ancient Relics', 20, '2012-01-01'),
(40, 'Written and Bound', 'Revelations', 20, '2012-01-01'),
(41, 'Words of Power', 'Revelations', 20, '2012-01-01'),
(42, 'Ebla Restored', 'Revelations', 20, '2012-01-01'),
(43, 'Lost Rites', 'Revelations', 20, '2012-01-01'),
(44, 'The Unspeakable Pages', 'Revelations', 20, '2012-01-01'),
(45, 'Touched by the Abyss', 'Revelations', 20, '2012-01-01'),
(46, 'Seekers of Knowledge', NULL, 55, '2012-01-01'),
(47, 'The Key and the Gate', NULL, 55, '2013-01-01'),
(48, 'Terror in Venice', NULL, 55, '2013-01-01'),
(49, 'Denizens of the Underworld', NULL, 55, '2014-01-01'),
(50, 'The Sleeper Below', NULL, 55, '2014-01-01'),
(51, 'For the Greater Good', NULL, 55, '2015-01-01'),
(52, 'The Thousand Young', NULL, 55, '2015-01-01'),
(53, 'The Mark of Madness', NULL, 55, '2015-01-01');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
