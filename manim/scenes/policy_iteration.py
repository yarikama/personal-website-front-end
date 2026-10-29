"""Clips for /learnings/policy-iteration."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words


class EvaluateImprove(Clip):
    """Policy improvement: one step ahead with the old values gives each
    move's worth, the new policy takes the best, and the policy improvement
    theorem says it is no worse anywhere. Then the loop of evaluating and
    improving, down to the best policy."""

    def construct(self):
        title = words("one move, then play as before", font_size=40, color=FADED)
        title.to_edge(UP, buff=0.35)
        self.play(FadeIn(title, shift=0.2 * DOWN))
        q, qp = split_formula(R"q_\pi(s,a)", "=", R"\sum_{s',r} p(s',r \mid s,a)\big[\, r + \gamma\, v_\pi(s')\,\big]", font_size=54)
        q.next_to(title, DOWN, buff=0.4)
        self.play(Write(q), run_time=1.8)
        self.wait(0.6)

        better, bp = split_formula(R"\pi'(s)", "=", R"\arg\max_a\,", R"q_\pi(s,a)", font_size=58, t2c={R"\arg\max_a\,": SAGE})
        better.next_to(q, DOWN, buff=0.35)
        self.play(FadeIn(bp[:3], shift=0.1 * DOWN), TransformFromCopy(qp[0], bp[3]), run_time=1.4)
        self.wait(0.4)

        # Square 7: rolling as before, or a step onto the ladder
        roll = formula(R"\text{roll: }{-8.55}", font_size=48, color=FADED)
        step = formula(R"\text{step: }{-7.22}", font_size=48, color=SAGE)
        row = VGroup(words("square 7", font_size=36, color=FADED), roll, step).arrange(RIGHT, buff=0.7)
        row.next_to(better, DOWN, buff=0.35)
        self.play(FadeIn(row, shift=0.1 * UP))
        self.play(FlashAround(step, color=SAGE, stroke_width=3))
        self.wait(0.8)

        # The guarantee
        theorem = formula(
            R"q_\pi(s, \pi^\prime(s)) \ge v_\pi(s) \text{ for all } s \quad\Longrightarrow\quad v_{\pi^\prime}(s) \ge v_\pi(s) \text{ for all } s",
            font_size=46,
        )
        theorem.next_to(row, DOWN, buff=0.45)
        self.play(Write(theorem), run_time=2)
        safe = words("no worse on any state", font_size=34, color=SAGE).next_to(theorem, DOWN, buff=0.2)
        self.play(FadeIn(safe, shift=0.1 * UP))
        self.wait(1)

        # Round and round
        loop, lp = split_formula(
            R"\pi_0", R"\xrightarrow{E}", R"v_{\pi_0}", R"\xrightarrow{I}", R"\pi_1", R"\xrightarrow{E}", R"v_{\pi_1}", R"\xrightarrow{I}", R"\cdots", R"\xrightarrow{I}", R"\pi_*",
            font_size=52,
            t2c={R"\pi_*": SAGE},
        )
        loop.next_to(safe, DOWN, buff=0.4)
        self.play(LaggedStart(*(FadeIn(p, shift=0.15 * RIGHT) for p in lp), lag_ratio=0.25), run_time=3)
        key = words("E: evaluate, I: improve, until nothing switches", font_size=32, color=FADED).next_to(loop, DOWN, buff=0.2)
        self.play(FadeIn(key))
        self.wait(4)
