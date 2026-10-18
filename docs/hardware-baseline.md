# M0 hardware and browser baseline

Recorded October 17, 2026, America/Chicago. Local inspection, not a benchmark.

| Item | Observed |
| --- | --- |
| Computer | MacBook Air Mac14,2 |
| CPU | Apple M2, 8 cores (4 performance + 4 efficiency) |
| GPU | Apple M2, 10 cores; Metal supported |
| Memory | 8 GB shared |
| OS | macOS 26.2, build 25C56 |
| Chrome installed | 155.0.8059.84 |
| Safari installed | 26.2 |
| Node / npm used | 22.12.0 / 11.7.0 |
| Data extraction runtime used | Bundled Python 3.12.14 |

Hardware comes from system_profiler. Browser versions come from application
Info.plist files. Device identifiers were not retained in this report.
Chrome is the initial measurement target; Safari is the second local target.
Installed versions are not evidence of browser compatibility or WebGL2 success.
Firefox, Edge, previous stable versions, touch devices, WebGL2 initialization,
context recovery, frame times, heap and transfer timing remain untested.

Use 1440×900 CSS pixels, DPR capped at 1.5, for the first recorded benchmark.
This is a prescribed test viewport, not a measurement of the current display.
Retain the technical plan's 30-second dense-Asia route and 20 Mbps / 50 ms cold-load
profile. M0's tiny build is not a representative application performance result.

The system Homebrew Python 3.14.5 fails to load its Expat extension. The bundled
Python successfully extracted the workbook. The README documents the override;
no global Python installation or system settings were changed.
