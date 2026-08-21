import React from 'react';
import { motion } from 'framer-motion';
import { Book, FileText, Clock, TrendingUp, Award, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Statistics.css';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function Statistics() {
  const { t } = useTranslation();

  const statsData = [
    { label: t('statistics.books_read'), value: '42', icon: Book },
    { label: t('statistics.pages_read'), value: '12,450', icon: FileText },
    { label: t('statistics.hours_spent'), value: '315', icon: Clock },
    { label: t('statistics.reading_streak'), value: '14 Days', icon: TrendingUp },
    { label: t('statistics.avg_completion'), value: '1.2 Weeks', icon: Calendar },
    { label: t('statistics.favorite_genre'), value: 'Science Fiction', icon: Award }
  ];

  return (
    <div className="statistics-page">
      <header className="page-header">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {t('statistics.title')}
        </motion.h1>
        <motion.p 
          className="subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {t('statistics.subtitle')}
        </motion.p>
      </header>

      <motion.div 
        className="stats-grid"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {statsData.map((stat, idx) => (
          <motion.div key={idx} className="stat-card glass-panel glass-hover-glow" variants={itemVariants}>
            <div className="stat-icon-wrapper">
              <stat.icon size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div 
        className="chart-placeholder glass-panel"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 24 }}
      >
        <h3>{t('statistics.monthly_trend')}</h3>
        <div className="chart-bars">
          {[40, 60, 45, 80, 50, 90, 75, 100, 65, 85, 70, 95].map((height, i) => (
            <div key={i} className="chart-bar-container">
              <div className="chart-bar-fill" style={{ height: `${height}%` }} />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
