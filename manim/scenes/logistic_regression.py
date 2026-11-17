"""Clips for /learnings/logistic-regression."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words


class LogLoss(Clip):
    """The chance of everything seen, a product, becomes a sum under the
    log, and its negative is the total surprise: the log loss. Then one
    patient's numbers dropped in."""

    def construct(self):
        said = words("the chance the curve gave everything you saw", font_size=38, color=FADED)
        said.to_edge(UP, buff=0.9)

        lik, lp = split_formula(
            "L(w)", "=", R"\prod_i\,", R"p_i^{\,y_i}", R"(1-p_i)^{\,1-y_i}",
            font_size=60,
        )
        lik.next_to(said, DOWN, buff=0.8)

        self.play(Write(said), run_time=1.6)
        self.play(FadeIn(lp[0:3]), run_time=0.8)
        self.play(FadeIn(lp[3:], shift=0.2 * LEFT), run_time=1.0)

        # One factor per patient: p if they had flu, 1 − p if not
        brace = Brace(lp[3:], DOWN, buff=0.15).set_fill(SAGE)
        which = words(R"$p_i$ if flu, $1-p_i$ if not", font_size=36, color=SAGE).next_to(brace, DOWN, buff=0.2)
        self.play(GrowFromCenter(brace), FadeIn(which, shift=0.2 * DOWN))
        self.wait(1.4)

        # Take the log: the product becomes a sum
        log, gp = split_formula(
            R"\ln L(w)", "=", R"\sum_i", R"\big[", R"y_i\ln p_i", "+", R"(1-y_i)\ln(1-p_i)", R"\big]",
            font_size=56,
        )
        log.move_to(lik)
        why = words("take the log: a product becomes a sum", font_size=38, color=FADED).move_to(said)
        self.play(FadeOut(brace), FadeOut(which), FadeTransform(said, why), run_time=0.8)
        self.play(
            FadeTransform(lp[0], gp[0]),
            FadeTransform(lp[1], gp[1]),
            FadeTransform(lp[2], gp[2]),
            FadeIn(gp[3]),
            FadeTransform(lp[3], gp[4]),
            FadeIn(gp[5]),
            FadeTransform(lp[4], gp[6]),
            FadeIn(gp[7]),
            run_time=1.8,
        )
        self.wait(1.0)

        # Flip the sign: maximising the chance is minimising the surprise
        nll, np_ = split_formula(
            R"-\ln L(w)", "=", R"\sum_i", R"\Big[", R"y_i\ln\frac{1}{p_i}", "+", R"(1-y_i)\ln\frac{1}{1-p_i}", R"\Big]",
            font_size=56,
            t2c={R"-\ln L(w)": SAGE},
        )
        nll.move_to(log)
        flip = words("flip the sign: most likely is least surprised", font_size=38, color=FADED).move_to(said)
        self.play(FadeTransform(why, flip), run_time=0.8)
        self.play(*(FadeTransform(gp[i], np_[i]) for i in range(8)), run_time=1.6)

        each = Brace(np_[4:7], DOWN, buff=0.15).set_fill(INK)
        surprise = words(R"surprise at patient $i$", font_size=36).next_to(each, DOWN, buff=0.2)
        self.play(GrowFromCenter(each), FadeIn(surprise, shift=0.2 * DOWN))
        name = words("the log loss, or cross-entropy", font_size=40, color=SAGE).move_to(said)
        self.play(FadeTransform(flip, name), run_time=0.9)
        self.wait(1.2)

        # One patient: 37.4 degrees, flu, given a 20% chance
        rule = Line(LEFT * 5.5, RIGHT * 5.5, stroke_color=RULE, stroke_width=2).next_to(surprise, DOWN, buff=0.7).set_x(0)
        who = words(R"37.4$^\circ$, flu: $y=1$, $p=0.20$", font_size=36, color=FADED).next_to(rule, DOWN, buff=0.35).set_x(0)
        sums, sp = split_formula(
            "1", R"\cdot", R"\ln\frac{1}{0.20}", "+", "0", "=", "1.61",
            font_size=56,
            t2c={"1.61": SAGE},
        )
        sums.next_to(who, DOWN, buff=0.35).set_x(0)
        self.play(ShowCreation(rule), FadeIn(who), run_time=0.9)
        self.play(
            LaggedStart(
                TransformFromCopy(np_[4], sp[0:3]),
                FadeIn(sp[3]),
                TransformFromCopy(np_[6], sp[4]),
                lag_ratio=0.3,
            ),
            run_time=2.0,
        )
        self.play(FadeIn(sp[5:], shift=0.2 * LEFT))
        self.play(Indicate(sp[6], color=SAGE, scale_factor=1.15))
        self.wait(2.5)
