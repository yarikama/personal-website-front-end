"""Clips for /learnings/gaussian-mixtures."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, words

# The maths font loses \; : a thick space spelled out
GAP = R"\mskip\thickmuskip "


class Responsibility(Clip):
    """A croissant's share for Corner: in words, Corner's share of the bin
    times how likely Corner makes this weight, over the same for every
    bakery. Then in symbols, then with the numbers for a 66 g croissant:
    0.17 Corner's, 0.83 the stall's."""

    def construct(self):
        title = words("how much of a 66 g croissant is Corner's?", font_size=38, color=FADED)
        title.to_edge(UP, buff=0.5)

        said = formula(
            R"\text{Corner's share} = \frac{\text{Corner's weight} \times \text{its bell's height}}"
            R"{\text{Corner's weight} \times \text{its height} + \text{the stall's} \times \text{its height}}",
            font_size=50,
            t2c={R"\text{Corner's weight} \times \text{its bell's height}": SAGE},
        )
        said.next_to(title, DOWN, buff=0.8)
        self.play(FadeIn(title, shift=0.2 * DOWN))
        self.play(Write(said), run_time=3)
        self.wait(1.4)

        # The same, in symbols
        rule = formula(
            R"r_1(x) = \frac{\pi_1 \, N_1(x)}{\pi_1 \, N_1(x) + \pi_2 \, N_2(x)}",
            font_size=64,
            t2c={R"r_1(x)": SAGE},
        )
        rule.move_to(said)
        self.play(FadeTransform(said, rule), run_time=1.8)
        legend = words(R"$\pi$: share of the bin \quad $N(x)$: the bell's height at $x$", font_size=36, color=FADED)
        legend.next_to(rule, DOWN, buff=0.5)
        self.play(FadeIn(legend, shift=0.2 * UP))
        self.wait(1.4)

        # The numbers at 66 g: half the bin each, and each bell's height there
        given = words(R"at 66 g: $\pi_1 = \pi_2 = 0.5$, \ $N_1 = 0.0022$, \ $N_2 = 0.0108$", font_size=36, color=FADED)
        given.next_to(legend, DOWN, buff=0.6)
        self.play(FadeIn(given))
        self.wait(0.6)

        worked = formula(
            R"r_1 = \frac{0.5 \times 0.0022}{0.5 \times 0.0022 + 0.5 \times 0.0108} = 0.17",
            font_size=56,
            t2c={"0.17": SAGE},
        )
        worked.next_to(given, DOWN, buff=0.6)
        self.play(TransformFromCopy(rule, worked), run_time=2)
        self.wait(0.8)
        other = words(R"and the stall's share: $1 - 0.17 = 0.83$", font_size=38, color=INK)
        other.next_to(worked, DOWN, buff=0.45)
        self.play(FadeIn(other, shift=0.2 * UP))

        # Hold the whole result
        self.play(FadeOut(title), VGroup(rule, legend, given, worked, other).animate.center(), run_time=0.8)
        self.wait(3)
