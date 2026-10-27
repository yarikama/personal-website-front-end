"""Clips for /learnings/tracking-change."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words


class Unroll(Clip):
    """A constant step, unrolled: the rule, then each old estimate replaced
    by the line that made it, until the estimate is a weighted sum of every
    reward and the start. Then the weights at α = 0.1, which add up to 1."""

    def construct(self):
        title = words("move a fixed step toward each reward", font_size=36, color=FADED)
        title.to_edge(UP, buff=0.5)
        rule, rp = split_formula(
            "Q_{k+1}", "=", "Q_k", "+", R"\alpha", "(", "R_k", "-", "Q_k", ")",
            font_size=60,
            t2c={"R_k": SAGE},
        )
        rule.next_to(title, DOWN, buff=0.45)
        self.play(FadeIn(title, shift=0.2 * DOWN))
        self.play(Write(rule), run_time=1.5)
        self.wait(0.6)

        # Multiply out: α of the reward, and what's left of the old estimate
        mixed, mp = split_formula(
            "Q_{k+1}", "=", R"\alpha", "R_k", "+", R"(1-\alpha)", "Q_k",
            font_size=60,
            t2c={"R_k": SAGE},
        )
        mixed.next_to(rule, DOWN, buff=0.6)
        self.play(
            TransformFromCopy(rp[0:2], mp[0:2]),
            TransformFromCopy(rp[4], mp[2]),
            TransformFromCopy(rp[6], mp[3]),
            FadeIn(mp[4:6]),
            TransformFromCopy(VGroup(rp[2], rp[8]), mp[6]),
            run_time=1.5,
        )
        said = words("a little of the new reward, the rest the old estimate", font_size=34, color=FADED)
        said.next_to(mixed, DOWN, buff=0.35)
        self.play(FadeIn(said, shift=0.2 * DOWN))
        self.wait(1)

        # The old estimate was made the same way, one reward earlier
        brace = Brace(mp[6], DOWN, buff=0.12).set_fill(SAGE)
        before = formula(R"\alpha R_{k-1} + (1-\alpha)\,Q_{k-1}", font_size=44, color=SAGE)
        before.next_to(brace, DOWN, buff=0.15)
        before.shift((min(before.get_right()[0], FRAME_WIDTH / 2 - 0.3) - before.get_right()[0]) * RIGHT)
        self.play(FadeOut(said), GrowFromCenter(brace), FadeIn(before, shift=0.2 * DOWN))
        self.wait(1)

        twice, tp = split_formula(
            "Q_{k+1}", "=", R"\alpha", "R_k", "+", R"(1-\alpha)\alpha", "R_{k-1}", "+", R"(1-\alpha)^2", "Q_{k-1}",
            font_size=52,
            t2c={"R_k": SAGE, "R_{k-1}": SAGE},
        )
        twice.next_to(before, DOWN, buff=0.6).set_x(0)
        self.play(
            TransformFromCopy(mp[0:5], tp[0:5]),
            FadeTransform(before.copy(), tp[5:]),
            run_time=1.5,
        )
        self.wait(1)

        # And so on, back to the first reward and the starting guess
        whole, wp = split_formula(
            "Q_{k+1}", "=", R"\alpha", "R_k", "+", R"(1-\alpha)\alpha", "R_{k-1}", "+",
            R"(1-\alpha)^2\alpha", "R_{k-2}", "+", R"\cdots", "+", R"(1-\alpha)^k", "Q_1",
            font_size=50,
            t2c={"R_k": SAGE, "R_{k-1}": SAGE, "R_{k-2}": SAGE},
        )
        whole.move_to(UP * 1.4)
        self.play(
            FadeOut(VGroup(title, rule, mixed, brace, before), shift=0.5 * UP),
            FadeTransform(twice[:], whole),
            run_time=1.8,
        )
        weights = VGroup(wp[2], wp[5], wp[8], wp[13])
        names = VGroup(
            *(
                words(text, font_size=30, color=FADED).next_to(term, UP, buff=0.3)
                for term, text in zip(weights, ["newest", "one back", "two back", "the start"])
            )
        )
        self.play(LaggedStart(*(FadeIn(name, shift=0.1 * DOWN) for name in names), lag_ratio=0.25), run_time=1.5)
        self.play(*(term.animate.set_fill(SAGE) for term in weights), run_time=0.6)
        self.wait(1)

        # The weights at α = 0.1, each under its term
        alpha = formula(R"\alpha = 0.1", font_size=46, color=FADED)
        values = VGroup(
            *(
                formula(text, font_size=46).next_to(term, DOWN, buff=1.6).set_x(term.get_x())
                for term, text in zip(weights, ["0.1", "0.09", "0.081", R"0.9^k"])
            )
        )
        values.set_y(whole.get_y() - 1.7)
        alpha.next_to(whole, DOWN, buff=0.45).align_to(whole, LEFT)
        self.play(FadeIn(alpha))
        self.play(LaggedStart(*(TransformFromCopy(t, v) for t, v in zip(weights, values)), lag_ratio=0.3), run_time=2)
        self.wait(0.8)

        # They add up to 1: still an average, leaning on the recent past
        total, sp = split_formula(
            "0.1", "+", "0.09", "+", "0.081", "+", R"\cdots", "+", R"0.9^k", "=", "1",
            font_size=58,
        )
        total.to_edge(DOWN, buff=1.3)
        sp[-1].set_fill(SAGE)
        self.play(
            LaggedStart(*(TransformFromCopy(v, sp[i]) for v, i in zip(values, [0, 2, 4, 8])), lag_ratio=0.2),
            FadeIn(VGroup(sp[1], sp[3], sp[5], sp[6], sp[7])),
            run_time=1.8,
        )
        self.play(FadeIn(sp[9:], shift=0.2 * LEFT))
        note = words("the weights add up to 1: an average that leans on the recent past", font_size=34, color=FADED)
        note.next_to(total, DOWN, buff=0.35)
        self.play(FlashAround(sp[-1], color=SAGE, stroke_width=3), FadeIn(note))
        self.wait(3)
