"""Clips for /learnings/gradient-bandits."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, split_words, words

# The Garamond maths has no partial sign: borrow newtx's
PARTIAL = R"\text{\usefont{OML}{ntxmi}{m}{it}\char64}"
SLOPE = Rf"\frac{{{PARTIAL}\, \mathbb{{E}}[R]}}{{{PARTIAL} H(a)}}"

# Where the softmax table's columns and rows sit
COLUMNS = [-1.4, 1.1, 3.6]
TOTAL_X = 6.0
ROWS = [1.6, 0.2, -1.2]
LABEL_RIGHT = -2.8


def _row(values, y, size=54, colors=None):
    """A row of numbers, one under each column."""
    row = VGroup()
    for i, value in enumerate(values):
        cell = formula(value, font_size=size, color=(colors[i] if colors else INK))
        cell.move_to([COLUMNS[i], y, 0])
        row.add(cell)
    return row


class Softmax(Clip):
    """Preferences turned into chances, with numbers: raise e to each, add
    them up, divide by the total. Then add the same amount to every
    preference: the e's all grow by one factor, and the chances stay put."""

    def construct(self):
        title = words("preferences into chances", font_size=38, color=FADED).to_edge(UP, buff=0.45)
        labels = VGroup(
            words(R"preference $H$", font_size=36),
            formula(R"e^{H}", font_size=54),
            words(R"chance $\pi$", font_size=36, color=SAGE),
        )
        for label, y in zip(labels, ROWS):
            label.move_to([0, y, 0]).align_to([LABEL_RIGHT, 0, 0], RIGHT)
        rule = Line([LABEL_RIGHT - 3.4, ROWS[2] + 0.7, 0], [TOTAL_X + 0.9, ROWS[2] + 0.7, 0], color=RULE, stroke_width=2)

        prefs = _row(["1", "2", "0"], ROWS[0])
        self.play(FadeIn(title, shift=0.2 * DOWN), FadeIn(labels[0]))
        self.play(LaggedStart(*(FadeIn(p, shift=0.2 * DOWN) for p in prefs), lag_ratio=0.2))
        self.wait(0.6)

        # e to the power of each: every one positive, bigger ones much bigger
        raised = _row(["2.72", "7.39", "1.00"], ROWS[1])
        self.play(FadeIn(labels[1]))
        self.play(LaggedStart(*(TransformFromCopy(p, r) for p, r in zip(prefs, raised)), lag_ratio=0.2), run_time=1.6)
        self.wait(0.4)

        # Their total
        total_word = words("total", font_size=34, color=FADED).move_to([TOTAL_X, ROWS[0], 0])
        total = formula("11.11", font_size=54, color=FADED).move_to([TOTAL_X, ROWS[1], 0])
        self.play(FadeIn(total_word), LaggedStart(*(TransformFromCopy(r, total) for r in raised), lag_ratio=0.1), run_time=1.4)
        self.wait(0.4)

        # Divide each by the total: chances that add up to 1
        chances = _row(["0.24", "0.67", "0.09"], ROWS[2], colors=[SAGE, SAGE, SAGE])
        self.play(ShowCreation(rule), FadeIn(labels[2]))
        self.play(
            LaggedStart(*(TransformFromCopy(VGroup(r, total), c) for r, c in zip(raised, chances)), lag_ratio=0.2),
            run_time=1.8,
        )
        self.wait(1.0)

        # Add 3 to every preference
        plus = words(R"add 3 to every one", font_size=36, color=SAGE).next_to(labels[0], UP, buff=0.35)
        plus.align_to(labels[0], RIGHT)
        self.play(FadeIn(plus, shift=0.2 * DOWN))
        self.play(*(Transform(p, formula(v, font_size=54).move_to(p)) for p, v in zip(prefs, ["4", "5", "3"])), run_time=1.2)
        # Every e^H grows by the same factor, e^3 ≈ 20, and so does the total
        self.play(
            *(Transform(r, formula(v, font_size=54).move_to(r)) for r, v in zip(raised, ["54.6", "148.4", "20.1"])),
            Transform(total, formula("223.1", font_size=54, color=FADED).move_to(total)),
            run_time=1.4,
        )
        factor = words(R"so every $e^{H}$, and the total, grows $\times\,20$", font_size=34, color=FADED)
        factor.next_to(plus, RIGHT, buff=0.6)
        self.play(FadeIn(factor))
        # The chances don't move
        self.play(Indicate(chances, color=SAGE, scale_factor=1.12), run_time=1.4)
        same = words("the same", font_size=34, color=SAGE).next_to(chances, RIGHT, buff=0.5)
        same.set_x(TOTAL_X)
        self.play(FadeIn(same))

        # The rule, in symbols
        rule_tex = formula(
            R"\pi(a) = \frac{e^{H(a)}}{\sum_b e^{H(b)}}",
            font_size=56,
            t2c={R"\pi(a)": SAGE},
        )
        rule_tex.to_edge(DOWN, buff=0.35)
        self.play(Write(rule_tex), run_time=2)
        self.wait(3)


class PreferenceUpdate(Clip):
    """The update built in words, then in symbols, then with numbers: the
    chosen option rises by step x surprise x (1 - its chance), each other
    falls by step x surprise x its chance, and the changes sum to 0."""

    def construct(self):
        surprise_said = words(R"surprise $=$ this reward $-$ your usual", font_size=38, color=SAGE)
        surprise_said.to_edge(UP, buff=0.5)
        chosen_said, cs = split_words(
            "chosen:", R"$+$", "step", R"$\times$", "surprise", R"$\times$", R"($1 -$ its chance)",
            font_size=38,
        )
        others_said, os_ = split_words(
            "each other:", R"$-$", "step", R"$\times$", "surprise", R"$\times$", "its chance",
            font_size=38,
        )
        chosen_said.next_to(surprise_said, DOWN, buff=0.7)
        others_said.next_to(chosen_said, DOWN, buff=0.45)
        others_said.align_to(chosen_said, LEFT)

        self.play(FadeIn(surprise_said, shift=0.2 * DOWN))
        self.wait(0.6)
        self.play(Write(chosen_said), run_time=2)
        self.wait(0.5)
        self.play(Write(others_said), run_time=2)
        self.wait(1.0)

        # The same two lines in symbols
        chosen, cp = split_formula(
            "H(A)", R"\leftarrow", "H(A)", "+", R"\alpha", R"(R - \bar R)", R"\big(1 - \pi(A)\big)",
            font_size=54,
            t2c={R"(R - \bar R)": SAGE, R"\alpha": FADED},
        )
        others, op = split_formula(
            "H(a)", R"\leftarrow", "H(a)", "-", R"\alpha", R"(R - \bar R)", R"\pi(a)",
            font_size=54,
            t2c={R"(R - \bar R)": SAGE, R"\alpha": FADED},
        )
        chosen.move_to(chosen_said)
        others.move_to(others_said)
        others.align_to(chosen, LEFT)
        surprise = words(R"surprise $= R - \bar R$", font_size=40, color=SAGE).move_to(surprise_said)

        # Words to symbols: label -> H, sign, step -> α, surprise, the chance part
        pairs = [(0, 0), (1, 3), (2, 4), (4, 5), (6, 6)]
        self.play(
            FadeTransform(surprise_said, surprise),
            *(FadeTransform(cs[i], cp[j]) for i, j in pairs),
            *(FadeTransform(os_[i], op[j]) for i, j in pairs),
            FadeOut(VGroup(cs[3], cs[5], os_[3], os_[5])),
            run_time=2,
        )
        self.play(FadeIn(VGroup(cp[1:3], op[1:3])))
        self.wait(1.0)

        lines = VGroup(surprise, chosen, others)
        self.play(lines.animate.shift(0.4 * UP))

        # Numbers: three options, each a third, a step of 0.5, 3 better than usual
        given = formula(R"\alpha = 0.5 \qquad R - \bar R = 3 \qquad \pi = \tfrac13 \text{ each}", font_size=48, color=FADED)
        given.next_to(others, DOWN, buff=0.6)
        self.play(FadeIn(given, shift=0.2 * DOWN))
        up = formula(R"+\,0.5 \times 3 \times \tfrac23 = +1", font_size=52, color=SAGE)
        down = formula(R"-\,0.5 \times 3 \times \tfrac13 = -0.5", font_size=52)
        up.next_to(given, DOWN, buff=0.45).set_x(-3.4)
        down.next_to(given, DOWN, buff=0.45).set_x(3.4)
        up_label = words("the chosen one", font_size=34, color=SAGE).next_to(up, DOWN, buff=0.2)
        down_label = words("each of the other two", font_size=34, color=FADED).next_to(down, DOWN, buff=0.2)
        self.play(FadeIn(up, shift=0.2 * DOWN), FadeIn(up_label))
        self.play(FadeIn(down, shift=0.2 * DOWN), FadeIn(down_label))
        self.wait(0.6)
        zero = words(R"$+1 - 0.5 - 0.5 = 0$: what one gains, the others lose", font_size=36)
        zero.next_to(VGroup(up_label, down_label), DOWN, buff=0.7)
        self.play(FadeIn(zero, shift=0.2 * UP))
        everything = VGroup(lines, given, up, down, up_label, down_label, zero)
        self.play(everything.animate.center(), run_time=1)
        self.wait(3)


class WhyItClimbs(Clip):
    """Why the rule climbs: averaged over the arm you might pick, its step is
    the slope of expected reward, and a baseline averages out to nothing.
    Only the key steps."""

    def construct(self):
        caption = words("if you knew every arm's payout $q$", font_size=36, color=FADED).to_edge(UP, buff=0.35)
        average = formula(R"\mathbb{E}[R] = \sum\nolimits_b \pi(b)\, q(b)", font_size=56)
        average.next_to(caption, DOWN, buff=0.3)
        self.play(FadeIn(caption), Write(average), run_time=1.8)
        self.wait(0.8)

        # The slope: nudge one preference and see the average move
        slope = formula(
            SLOPE + R" = \sum\nolimits_b q(b)\, \pi(b) \big(\mathbf{1}_{a=b} - \pi(a)\big)",
            font_size=52,
        )
        slope.next_to(average, DOWN, buff=0.5)
        slope_caption = words(R"its slope, as you nudge $H(a)$", font_size=36, color=FADED)
        slope_caption.next_to(slope, DOWN, buff=0.25)
        self.play(FadeIn(slope, shift=0.2 * DOWN), FadeIn(slope_caption))
        self.wait(1.4)

        # The sum weighted by π(b) is an average over the arm A you pick, and
        # the reward you get stands in for q(A)
        as_average = formula(
            SLOPE + R" = \mathbb{E}\big[\, R\, (\mathbf{1}_{a=A} - \pi(a)) \,\big]",
            font_size=52,
        )
        as_average.move_to(slope)
        avg_caption = words(R"an average over the arm $A$ you pick, its reward $R$ in place of $q$", font_size=34, color=FADED)
        avg_caption.next_to(as_average, DOWN, buff=0.25)
        self.play(
            FadeTransform(slope, as_average),
            FadeTransform(slope_caption, avg_caption),
            run_time=1.8,
        )
        self.wait(1.6)

        # Make room: the slope and its reading go to the top
        top = VGroup(as_average, avg_caption)
        self.play(FadeOut(VGroup(caption, average), shift=0.5 * UP), top.animate.to_edge(UP, buff=0.4), run_time=1.2)

        # A baseline adds nothing on average: A is a with chance π(a)
        baseline = formula(
            R"\mathbb{E}\big[\, \bar R\, (\mathbf{1}_{a=A} - \pi(a)) \,\big] = \bar R\,\big(\pi(a) - \pi(a)\big) = 0",
            font_size=52,
        )
        baseline.next_to(avg_caption, DOWN, buff=0.6)
        base_caption = words(R"you pick $a$ with chance $\pi(a)$, so a baseline averages out", font_size=34, color=FADED)
        base_caption.next_to(baseline, DOWN, buff=0.25)
        self.play(FadeIn(baseline, shift=0.2 * DOWN), FadeIn(base_caption))
        self.wait(1.8)

        # So the rule's step, on average, is uphill
        result = formula(
            R"\mathbb{E}\big[\, \alpha (R - \bar R)(\mathbf{1}_{a=A} - \pi(a)) \,\big] = \alpha\, " + SLOPE,
            font_size=52,
            t2c={R"(R - \bar R)": SAGE},
        )
        result.next_to(base_caption, DOWN, buff=0.6)
        box = SurroundingRectangle(result, buff=0.18, stroke_color=SAGE, stroke_width=2.5)
        verdict = words("the rule's step climbs the slope, on average", font_size=36, color=SAGE)
        verdict.next_to(box, DOWN, buff=0.25)
        self.play(Write(result), run_time=2)
        self.play(ShowCreation(box), FadeIn(verdict, shift=0.2 * UP))
        self.play(VGroup(top, baseline, base_caption, result, box, verdict).animate.center(), run_time=1)
        self.wait(3)
