import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ContributorCard from "./ContributorCard";

export default function Contributors() {
  const [contributors, setContributors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContributors() {
      try {
        const res = await fetch(
          "https://api.github.com/repos/Unknownbeliek/localflux/contributors"
        );
        const data = await res.json();

        if (!Array.isArray(data)) {
          setContributors([]);
          return;
        }

        const myUsername = "PrabhuVerma00";
        const myIndex = data.findIndex((c) => c.login === myUsername);

        let sorted = [...data];

        if (myIndex !== -1) {
          sorted.splice(myIndex, 1);

          const isTop =
            data[myIndex].contributions >= data[0].contributions;

          if (isTop) {
            sorted.unshift(data[myIndex]);
          } else {
            sorted.splice(1, 0, data[myIndex]);
          }
        }

        setContributors(sorted.slice(0, 8));
      } catch (err) {
        console.error(err);
        setContributors([]);
      } finally {
        setLoading(false);
      }
    }

    fetchContributors();
  }, []);

  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 w-[500px] h-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center">

        {/* SAFE ROTATING ICON (NO LIB) */}
        <motion.div
          className="mb-6 flex justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <div className="w-8 h-8 rounded-full border border-emerald-400 flex items-center justify-center text-emerald-400 text-sm">
            GH
          </div>
        </motion.div>

        {/* heading */}
        <h2 className="text-4xl font-bold text-white mb-3">
          Built by the{" "}
          <span className="text-emerald-400">Community</span>
        </h2>

        {/* subtext */}
        <p className="text-gray-400 mb-12">
          Powered by amazing contributors on GitHub
        </p>

        {/* grid */}
        <div className="flex justify-center">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-6 mb-12">
            {loading ? (
              <div className="col-span-full text-gray-500">
                Loading contributors...
              </div>
            ) : contributors.length === 0 ? (
              <div className="col-span-full text-gray-500">
                No contributors found
              </div>
            ) : (
              contributors.map((c, i) => (
                <ContributorCard key={c.id} contributor={c} index={i} />
              ))
            )}
          </div>
        </div>

        {/* button */}
        <div className="flex justify-center">
          <a
            href="https://github.com/Unknownbeliek/localflux"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative px-6 py-3 rounded-lg border border-emerald-400/30 hover:border-emerald-400/60 text-emerald-400 transition overflow-hidden"
          >
            <span className="relative z-10">View All on GitHub</span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-emerald-400/10" />
          </a>
        </div>

      </div>
    </section>
  );
}