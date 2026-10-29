"""Clips for /learnings/generalized-policy-iteration."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words

BACKUP = R"\sum_{s',r} p(s',r \mid s,a)\big[\, r + \gamma\, V(s')\,\big]"


class BothRest(Clip):
    """Each pull's stopping condition, then the two put together. Judging
    at rest: V satisfies the policy's own equation, so V is v_pi. Improving
    at rest: the policy's move is the argmax by V. Put the argmax into the
    first equation and it becomes the optimality equation, so the resting
    point is the best."""

    def construct(self):
        # Judging is at rest
        t1 = words("judging is done: a pass changes nothing", font_size=38, color=FADED)
        t1.to_edge(UP, buff=0.45)
        self.play(FadeIn(t1, shift=0.2 * DOWN))
        f1, p1 = split_formula(
            "V(s)", "=", R"\sum_{s',r} p(s',r \mid s,\,", R"\pi(s)", R")\big[\, r + \gamma\, V(s')\,\big]",
            font_size=54,
            t2c={R"\pi(s)": SAGE},
        )
        f1.next_to(t1, DOWN, buff=0.4)
        self.play(Write(f1), run_time=1.8)
        n1 = words(R"so $V = v_\pi$: the values are the play's own", font_size=36, color=SAGE)
        n1.next_to(f1, DOWN, buff=0.3)
        self.play(FadeIn(n1, shift=0.1 * UP))
        self.wait(1)

        # Improving is at rest
        t2 = words("improving is done: no move switches", font_size=38, color=FADED)
        t2.next_to(n1, DOWN, buff=0.6)
        self.play(FadeIn(t2, shift=0.1 * DOWN))
        f2, p2 = split_formula(R"\pi(s)", "=", R"\arg\max_a", BACKUP, font_size=54, t2c={R"\pi(s)": SAGE})
        f2.next_to(t2, DOWN, buff=0.4)
        self.play(Write(f2), run_time=1.8)
        self.wait(1.2)

        # Put the argmax in for the policy's move
        t3 = words("both at once: the policy's move is the best move", font_size=38, color=FADED).move_to(t1)
        f3, p3 = split_formula("V(s)", "=", R"\max_a", BACKUP, font_size=56, t2c={R"\max_a": SAGE})
        f3.next_to(t3, DOWN, buff=0.5)
        self.play(
            FadeTransform(t1, t3),
            FadeTransform(p1[0], p3[0]),
            FadeTransform(p1[1], p3[1]),
            FadeTransform(VGroup(p1[2], p1[3], p1[4]), p3[3]),
            FadeTransform(p2[2], p3[2]),
            FadeOut(VGroup(p2[0], p2[1], p2[3], t2, n1)),
            run_time=2.2,
        )
        self.play(FlashAround(p3[2], color=SAGE, stroke_width=3))
        name = words("the Bellman optimality equation", font_size=40, color=SAGE)
        name.next_to(f3, DOWN, buff=0.35)
        self.play(FadeIn(name, shift=0.1 * UP))
        so = formula(R"V = v_* \qquad \pi = \pi_*", font_size=56)
        so.next_to(name, DOWN, buff=0.45)
        self.play(Write(so), run_time=1.2)
        self.wait(1)

        # Square 12, at rest
        twelve, tp = split_formula(
            R"V(12) = \max\big(\underbrace{-5.53}_{\text{roll}},\ \underbrace{-5.97}_{\text{step}}\big)", "=", "-5.53",
            font_size=50,
        )
        tp[2].set_color(SAGE)
        twelve.next_to(so, DOWN, buff=0.6)
        self.play(FadeIn(twelve, shift=0.15 * DOWN), run_time=1.6)
        self.wait(4)
