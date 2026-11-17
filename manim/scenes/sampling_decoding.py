"""Clips for /learnings/sampling-decoding."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, words

BEACH = R"\text{beach}"
SPOON = R"\text{spoon}"


class TemperatureRatio(Clip):
    """Temperature divides every score before the softmax. Compare two words:
    the sum underneath is the same for both and cancels, leaving e to the
    gap in their scores over tau. With scores the logs of the slips, beach is
    36 to the 1/tau times as likely as a joke word: 1,296 at 0.5, 36 at 1,
    6 at 2."""

    def construct(self):
        title = words("temperature divides every score", font_size=38, color=FADED).to_edge(UP, buff=0.45)
        softmax = formula(
            R"p(w) = \frac{e^{s_w/\tau}}{\sum_v e^{s_v/\tau}}",
            font_size=60,
            t2c={R"\tau": SAGE},
        )
        softmax.next_to(title, DOWN, buff=0.45)
        self.play(FadeIn(title, shift=0.2 * DOWN))
        self.play(Write(softmax), run_time=2)
        self.wait(1.2)

        # Two words side by side: the same sum under both
        pair = formula(
            Rf"\frac{{p({BEACH})}}{{p({SPOON})}} = \frac{{e^{{s_{{{BEACH}}}/\tau}} \,/\, \Sigma}}{{e^{{s_{{{SPOON}}}/\tau}} \,/\, \Sigma}}",
            font_size=56,
        )
        pair.next_to(softmax, DOWN, buff=0.6)
        self.play(TransformFromCopy(softmax, pair), run_time=1.6)
        same = words(R"the same sum, top and bottom", font_size=34, color=FADED).next_to(pair, RIGHT, buff=0.5)
        self.play(FadeIn(same))
        self.wait(1.0)

        # It cancels: what is left is the gap in scores, over tau
        gap = formula(
            Rf"\frac{{p({BEACH})}}{{p({SPOON})}} = e^{{(s_{{{BEACH}}} - s_{{{SPOON}}})/\tau}}",
            font_size=56,
            t2c={R"\tau": SAGE},
        )
        gap.move_to(pair)
        self.play(FadeOut(same), TransformMatchingTex(pair, gap), run_time=1.6)
        self.wait(0.8)

        # Scores that are the logs of the slips: the gap is ln 36
        logs = words(R"scores $=$ logs of the slips: beach has 36, spoon one", font_size=34, color=FADED)
        logs.next_to(gap, DOWN, buff=0.4)
        self.play(FadeIn(logs, shift=0.2 * DOWN))
        power = formula(R"= 36^{1/\tau}", font_size=56, t2c={R"\tau": SAGE}).next_to(gap, RIGHT, buff=0.3)
        self.play(Write(power), run_time=1.2)
        self.play(VGroup(gap, power).animate.set_x(0), logs.animate.set_x(0))
        self.wait(1.0)

        # Three temperatures
        rows = VGroup()
        for tau, value, said in [("0.5", "1{,}296", "sharper"), ("1", "36", "as the slips"), ("2", "6", "flatter")]:
            row = VGroup(
                formula(Rf"\tau = {tau}", font_size=54, color=SAGE),
                formula(Rf"{value}\times", font_size=54),
                words(said, font_size=34, color=FADED),
            )
            rows.add(row)
        for i, row in enumerate(rows):
            y = -1.75 - i * 0.8
            row[0].move_to([-3.6, y, 0])
            row[1].move_to([0.0, y, 0])
            row[2].move_to([3.6, y, 0])
        rule = Line([-5.2, -1.2, 0], [5.2, -1.2, 0], color=RULE, stroke_width=2)
        self.play(FadeOut(logs), ShowCreation(rule))
        for row in rows:
            self.play(FadeIn(row, shift=0.15 * DOWN), run_time=0.9)
            self.wait(0.4)
        self.wait(3)
