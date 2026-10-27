"""Clips for /learnings/temporal-difference-learning."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, split_words, words

class TdUpdate(Clip):
    """The rule in words, then in symbols, then with numbers on a line from
    0 to 1: the old guess moves a tenth of the way to the next one."""

    def construct(self):
        said, sp = split_words(
            "new guess", R"$\leftarrow$", "old guess", "+", "step", R"$\times$", "(", "next guess", R"$-$", "old guess", ")",
            font_size=40,
        )
        rule, rp = split_formula(
            "V(s)", R"\leftarrow", "V(s)", "+", R"\alpha", R"\big[", "V(s')", "-", "V(s)", R"\big]",
            font_size=64,
            t2c={"V(s')": SAGE, R"\alpha": FADED},
        )
        said.to_edge(UP, buff=1.0)
        rule.next_to(said, DOWN, buff=0.8)

        self.play(Write(said), run_time=2.5)
        self.wait(0.8)
        # Each phrase becomes its symbol
        pairs = [(0, 0), (1, 1), (2, 2), (3, 3), (4, 4), (6, 5), (7, 6), (8, 7), (9, 8), (10, 9)]
        self.play(
            LaggedStart(*(FadeTransform(sp[i].copy(), rp[j]) for i, j in pairs), lag_ratio=0.12),
            FadeOut(sp[5]),
            run_time=2.5,
        )
        self.play(FadeOut(said), rule.animate.to_edge(UP, buff=1.0), run_time=1)

        # The bracket is the surprise: how much better or worse the next
        # position looks than this one did
        gap = rp[5:]
        brace = Brace(gap, DOWN, buff=0.15).set_fill(SAGE)
        surprise = words("the surprise", font_size=36, color=SAGE).next_to(brace, DOWN, buff=0.15)
        self.play(GrowFromCenter(brace), FadeIn(surprise, shift=0.2 * DOWN))
        self.wait(1.2)

        # Now with numbers, on the line of chances to win
        line = NumberLine(x_range=[0, 1, 0.1], width=11, color=RULE, tick_size=0.06, stroke_width=3)
        line.to_edge(DOWN, buff=1.3)
        ends = VGroup(
            formula("0", font_size=34, color=FADED).next_to(line.n2p(0), DOWN, buff=0.25),
            formula("1", font_size=34, color=FADED).next_to(line.n2p(1), DOWN, buff=0.25),
        )
        caption = words("chance of winning", font_size=30, color=FADED).next_to(line, DOWN, buff=0.3)

        old = Dot(line.n2p(0.5), radius=0.13, fill_color=INK)
        nxt = Dot(line.n2p(0.9), radius=0.13, fill_color=SAGE)
        old_label = formula("0.5", font_size=40).next_to(old, UP, buff=0.25)
        next_label = formula("0.9", font_size=40, color=SAGE).next_to(nxt, UP, buff=0.25)

        sums, np_ = split_formula(
            "0.50", "+", "0.1", R"\times", "(", "0.90", "-", "0.50", ")", "=", "0.54",
            font_size=52,
            t2c={"0.90": SAGE, "0.1": FADED},
        )
        sums.move_to(UP * 0.1)

        self.play(
            FadeOut(brace), FadeOut(surprise),
            ShowCreation(line), FadeIn(ends), FadeIn(caption),
        )
        self.play(FadeIn(old, scale=0.5), FadeIn(old_label))
        self.play(FadeIn(nxt, scale=0.5), FadeIn(next_label))
        self.wait(0.6)

        # Each number drops in under its symbol
        self.play(
            LaggedStart(
                TransformFromCopy(rp[2], np_[0]),
                FadeIn(np_[1]),
                TransformFromCopy(rp[4], np_[2]),
                FadeIn(np_[3:5]),
                TransformFromCopy(rp[6], np_[5]),
                FadeIn(np_[6]),
                TransformFromCopy(rp[8], np_[7]),
                FadeIn(np_[8]),
                lag_ratio=0.2,
            ),
            run_time=2.5,
        )
        self.wait(0.5)

        # A tenth of the gap: from 0.5 to 0.54
        # Above the labels, from the old guess toward the next
        arrow = Arrow(old.get_center(), nxt.get_center(), buff=0, stroke_color=SAGE, stroke_width=4)
        arrow.shift(1.05 * UP)
        self.play(GrowArrow(arrow))
        moved = formula("0.54", font_size=40).next_to(line.n2p(0.54), UP, buff=0.25)
        self.play(
            old.animate.move_to(line.n2p(0.54)),
            Transform(old_label, moved),
            FadeIn(np_[9:], shift=0.2 * LEFT),
            FadeOut(arrow),
            run_time=1.6,
        )
        self.play(Indicate(np_[10], color=INK, scale_factor=1.15))
        self.wait(2.5)


class TdBlend(Clip):
    """The same rule rearranged: keep most of the old guess, take a little of
    the next. Then the running average, which has the same shape."""

    def construct(self):
        first, fp = split_formula(
            "V(s)", R"\leftarrow", "V(s)", "+", R"\alpha", R"\big[", "V(s')", "-", "V(s)", R"\big]",
            font_size=60,
            t2c={"V(s')": SAGE, R"\alpha": FADED},
        )
        opened, op = split_formula(
            "V(s)", R"\leftarrow", "V(s)", "-", R"\alpha", "V(s)", "+", R"\alpha", "V(s')",
            font_size=60,
            t2c={"V(s')": SAGE, R"\alpha": FADED},
        )
        blend, bp = split_formula(
            "V(s)", R"\leftarrow", "(", "1", "-", R"\alpha", ")", "V(s)", "+", R"\alpha", "V(s')",
            font_size=60,
            t2c={"V(s')": SAGE, R"\alpha": FADED},
        )
        for line in (first, opened, blend):
            line.to_edge(UP, buff=1.2)

        self.play(Write(first), run_time=2)
        self.wait(0.8)
        # Open the bracket
        self.play(
            TransformFromCopy(fp[0:2], op[0:2]),
            TransformFromCopy(fp[2], op[2]),
            TransformFromCopy(fp[7], op[3]),
            TransformFromCopy(fp[4], op[4]),
            TransformFromCopy(fp[8], op[5]),
            TransformFromCopy(fp[3], op[6]),
            TransformFromCopy(fp[4], op[7]),
            TransformFromCopy(fp[6], op[8]),
            FadeOut(first),
            run_time=2,
        )
        self.wait(0.6)
        # Gather the two V(s)
        self.play(
            ReplacementTransform(op[0:2], bp[0:2]),
            ReplacementTransform(op[2], bp[3]),
            ReplacementTransform(op[3], bp[4]),
            ReplacementTransform(op[4], bp[5]),
            FadeIn(bp[2]),
            FadeIn(bp[6]),
            ReplacementTransform(op[5], bp[7]),
            ReplacementTransform(op[6:], bp[8:]),
            run_time=2,
        )
        self.wait(0.6)

        # With a step of a tenth
        keep_brace = Brace(bp[2:8], DOWN, buff=0.15).set_fill(INK)
        take_brace = Brace(bp[9:], DOWN, buff=0.15).set_fill(SAGE)
        keep = words(R"keep 90\%\\of your guess", font_size=34).next_to(keep_brace, DOWN, buff=0.2)
        take = words(R"take 10\%\\of the next", font_size=34, color=SAGE).next_to(take_brace, DOWN, buff=0.2)
        self.play(GrowFromCenter(keep_brace), FadeIn(keep, shift=0.2 * DOWN))
        self.play(GrowFromCenter(take_brace), FadeIn(take, shift=0.2 * DOWN))
        self.wait(1.5)

        # The running average has the same shape: only the target differs
        ours = VGroup(blend, keep_brace, take_brace, keep, take)
        td, tp = split_formula(
            "V(s)", R"\leftarrow", "V(s)", "+", R"\alpha", R"\big[", "V(s')", "-", "V(s)", R"\big]",
            font_size=52,
            t2c={"V(s')": SAGE, R"\alpha": FADED},
        )
        mean, mp = split_formula(
            "Q", R"\leftarrow", "Q", "+", R"\tfrac{1}{n}", R"\big[", "R", "-", "Q", R"\big]",
            font_size=52,
            t2c={"R": SAGE, R"\tfrac{1}{n}": FADED},
        )
        td.move_to(UP * 1.4 + LEFT * 3.2)
        mean.move_to(UP * 1.4 + RIGHT * 3.2)
        td_says = words("aims at the next guess", font_size=32, color=SAGE).next_to(td, DOWN, buff=0.45)
        mean_says = words("aims at what happened", font_size=32, color=SAGE).next_to(mean, DOWN, buff=0.45)
        td_name = words("learning a value", font_size=30, color=FADED).next_to(td, UP, buff=0.45)
        mean_name = words("keeping an average", font_size=30, color=FADED).next_to(mean, UP, buff=0.45)
        both = words("same shape: old + step $\\times$ (target $-$ old)", font_size=38).to_edge(DOWN, buff=1.0)

        self.play(FadeOut(ours), run_time=0.8)
        self.play(FadeIn(td), FadeIn(td_name))
        self.play(FadeIn(mean), FadeIn(mean_name))
        self.wait(0.6)
        self.play(
            Indicate(tp[6], color=SAGE, scale_factor=1.3),
            Indicate(mp[6], color=SAGE, scale_factor=1.3),
            FadeIn(td_says, shift=0.2 * UP),
            FadeIn(mean_says, shift=0.2 * UP),
        )
        self.play(FadeIn(both, shift=0.2 * UP))
        self.wait(3)
