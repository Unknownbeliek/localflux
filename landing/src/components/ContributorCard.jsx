import { motion } from "framer-motion";

export default function ContributorCard({ contributor, index }) {
  return (
    <motion.a
      href={contributor.html_url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -4 }}
      className="group relative rounded-lg border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] p-4 backdrop-blur-sm transition-[background-color,border-color,transform,color] duration-300 hover:border-emerald-500/40 dark:hover:border-emerald-400/30 hover:bg-white"
    >
      {/* avatar */}
      <div className="relative w-12 h-12 rounded-full overflow-hidden mb-3 mx-auto border border-slate-300 dark:border-white/20 transition-colors duration-300">
        <img
          src={contributor.avatar_url}
          alt={contributor.login}
          className="w-full h-full object-cover"
        />
      </div>

      {/* username */}
      <p className="text-sm font-medium text-slate-900 dark:text-white text-center group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
        {contributor.login}
      </p>

      {/* contributions */}
      <p className="text-xs text-slate-500 dark:text-gray-500 text-center mt-1 transition-colors duration-300">
        {contributor.contributions} contributions
      </p>
    </motion.a>
  );
}
