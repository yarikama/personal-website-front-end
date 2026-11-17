"""Clips for /learnings/external-merge-sort."""

from manimlib import *

from style import FADED, SAGE, Clip, split_formula, split_words, words

# Relations set apart in pieces of their own lose TeX's spacing: spelled out
LE = R"\mskip\thickmuskip\le\mskip\thickmuskip"
APPROX = R"\mskip\thickmuskip\approx\mskip\thickmuskip"


class MergeLimit(Clip):
    """How big two passes can go. Phase 1 leaves B/M runs; the merge needs a
    page for each run and one for output, all inside M; so B/M + 1 <= M,
    which is B <= M(M - 1), about M squared. Then 1 GB of memory in 4 KB
    pages: about 256 TB."""

    def construct(self):
        # The runs phase 1 leaves, in words then symbols
        said, sp = split_words("runs", "=", "data", "/", "memory", font_size=46, color=FADED)
        runs, rp = split_formula(R"\text{runs}", "=", "B", "/", "M", font_size=60)
        said.to_edge(UP, buff=0.7)
        runs.next_to(said, DOWN, buff=0.4)

        self.play(Write(said), run_time=1.4)
        self.play(
            LaggedStart(*(FadeTransform(sp[i].copy(), rp[i]) for i in range(5)), lag_ratio=0.15),
            run_time=1.6,
        )
        self.play(FadeOut(said), runs.animate.to_edge(UP, buff=0.7), run_time=0.8)

        # What the merge holds: a page per run and one for output
        need, np_ = split_words(
            "a page per run", "+", "an output page", R"$\le$", "memory",
            font_size=44,
            color=FADED,
        )
        held, hp = split_formula("B/M", "+", "1", LE, "M", font_size=72, t2c={"1": SAGE})
        need.next_to(runs, DOWN, buff=0.9)
        held.next_to(need, DOWN, buff=0.45)
        self.play(FadeIn(need, shift=0.2 * DOWN), run_time=1.2)
        self.wait(0.6)
        self.play(
            TransformFromCopy(rp[2:], hp[0]),
            FadeTransform(np_[1].copy(), hp[1]),
            FadeTransform(np_[2].copy(), hp[2]),
            FadeTransform(np_[3].copy(), hp[3]),
            FadeTransform(np_[4].copy(), hp[4]),
            run_time=1.8,
        )
        self.wait(0.8)
        self.play(FadeOut(need), held.animate.next_to(runs, DOWN, buff=1.1), run_time=0.8)

        # Move the 1 across, then multiply through by M
        moved, mp = split_formula("B/M", LE, "M", "-", "1", font_size=72, t2c={"1": SAGE})
        moved.move_to(held)
        self.play(
            ReplacementTransform(hp[0], mp[0]),
            ReplacementTransform(hp[3], mp[1]),
            ReplacementTransform(hp[4], mp[2]),
            ReplacementTransform(hp[1], mp[3]),
            ReplacementTransform(hp[2], mp[4]),
            run_time=1.4,
        )
        self.wait(0.6)
        limit, lp = split_formula(
            "B", LE, "M", "(", "M", "-", "1", ")", APPROX, "M^2",
            font_size=72,
            t2c={"1": SAGE},
        )
        limit.move_to(moved)
        lp[8:].set_fill(SAGE)
        self.play(
            FadeTransform(mp[0], lp[0]),
            ReplacementTransform(mp[1], lp[1]),
            FadeIn(lp[2:4], shift=0.2 * RIGHT),
            ReplacementTransform(mp[2], lp[4]),
            ReplacementTransform(mp[3], lp[5]),
            ReplacementTransform(mp[4], lp[6]),
            FadeIn(lp[7]),
            run_time=1.6,
        )
        self.wait(0.6)
        self.play(FadeIn(lp[8:], shift=0.2 * LEFT), run_time=1)
        self.wait(1.2)

        # With numbers: 1 GB of memory in 4 KB pages
        given = words(R"1 GB of memory in 4 KB pages: $M = 262{,}144$", font_size=44, color=FADED)
        sums, sp2 = split_formula(
            "B", LE, R"262{,}144", R"\times", R"262{,}143", APPROX, R"6.9 \times 10^{10}", R"\text{ pages}",
            font_size=56,
        )
        size = words("about 256 TB, in two passes", font_size=50, color=SAGE)
        given.next_to(limit, DOWN, buff=0.9)
        sums.next_to(given, DOWN, buff=0.45)
        size.next_to(sums, DOWN, buff=0.45)

        self.play(FadeIn(given, shift=0.2 * DOWN))
        self.play(
            LaggedStart(
                TransformFromCopy(lp[0], sp2[0]),
                TransformFromCopy(lp[1], sp2[1]),
                TransformFromCopy(lp[2], sp2[2]),
                FadeIn(sp2[3]),
                TransformFromCopy(lp[4:7], sp2[4]),
                lag_ratio=0.2,
            ),
            run_time=2.2,
        )
        self.play(FadeIn(sp2[5:], shift=0.2 * LEFT), run_time=1)
        self.play(FadeIn(size, shift=0.2 * UP), run_time=1)
        self.play(Indicate(size, color=SAGE, scale_factor=1.08))
        self.wait(3)
