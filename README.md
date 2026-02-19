```
 a,  8a
 `8, `8)                            ,adPPRg,
  8)  ]8                        ,ad888888888b
 ,8' ,8'                    ,gPPR888888888888
,8' ,8'                 ,ad8""   `Y888888888P
8)  8)              ,ad8""        (8888888""
8,  8,          ,ad8""            d888""
`8, `8,     ,ad8""            ,ad8""
 `8, `" ,ad8""            ,ad8""
    ,gPPR8b           ,ad8""
   dP:::::Yb      ,ad8""
   8):::::(8  ,ad8""
   Yb:;;;:d888""  
    "8ggg8P"      
```

# Cig Loop

A lean ralph loop library for Claude Code. Skips the setup, gives you boilerplates, and adds quality-of-life so you can focus on your prompt.

We measure costs in cigarettes. A cigarette burns at roughly the same speed Opus tokens stream, and costs about the same per minute. So we track time in cigs and costs in packs.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/Metroxe/cig-loop/main/install.sh | bash
```

## Run

```bash
cig-loop
```

Runs the loop interactively. For non-interactive / CI usage:

```bash
cig-loop -p ./PROMPT.md -i 10 -m opus --no-interactive
```

## Boilerplate

```bash
cig-loop boilerplate
```

Pulls a starter template so you don't write the same scaffolding twice. `--list` to see what's available, `--name <template>` to skip the menu.

## Update

```bash
cig-loop update
```

Self-updates the binary in place.
