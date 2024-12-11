// Wintermute is a tool for converting Twine stories to a JSON format.
// It's named after the Wintermute AI from the novel Neuromancer.
// At the moment, it's a fork of Twison with TypeScript support.

interface Link {
  name: string;
  link: string;
  pid?: string;
  broken?: boolean;
}

interface Passage {
  text: string;
  links: Link[];
  props: RecursiveProps;
  name: string;
  pid: string;
  position: {
    x: string;
    y: string;
  };
  tags: string[];
}

interface RecursiveProps {
  [key: string]: string | RecursiveProps;
}

interface Story {
  passages: Passage[];
  name: string;
  startnode: string;
  creator: string;
  creatorVersion: string;
  ifid: string;
}

const Wintermute = {
  extractLinksFromText: function (text: string): Link[] | null {
    const links = text.match(/\[\[.+?\]\]/g);
    if (!links) {
      return null;
    }

    return links.map(function (link): Link {
      const differentName = link.match(/\[\[(.*?)\-\&gt;(.*?)\]\]/);
      if (differentName) {
        // [[name->link]]
        return {
          name: differentName[1],
          link: differentName[2]
        };
      } else {
        // [[link]]
        link = link.substring(2, link.length - 2)
        return {
          name: link,
          link: link
        }
      }
    });
  },

  extractPropsFromText: function (text: string): RecursiveProps | null {
    let propMatch: RegExpExecArray | null;
    let matchFound = false;
    const props: RecursiveProps = {};
    const propRegexPattern = /\{\{((\s|\S)+?)\}\}((\s|\S)+?)\{\{\/\1\}\}/gm;

    while ((propMatch = propRegexPattern.exec(text)) !== null) {
      // The "key" of the prop, AKA the value wrapped in {{ }}.
      const key = propMatch[1];

      // Extract and sanitize the actual value.
      // This will remove any new lines.
      const value = propMatch[3].replace(/(\r\n|\n|\r)/gm, '');

      // We can nest props like so: {{foo}}{{bar}}value{{/bar}}{{/foo}},
      // so call this same method again to extract the values further.
      const furtherExtraction = this.extractPropsFromText(value);

      if (furtherExtraction !== null) {
        props[key] = furtherExtraction;
      } else {
        props[key] = value;
      }

      matchFound = true;
    }

    if (!matchFound) {
      return null;
    }

    return props;
  },

  convertPassage: function (passageEl: HTMLElement): Passage {
    const passage: Passage = {
      text: passageEl.innerHTML,
      links: [],
      props: {},
      name: "",
      pid: "",
      position: { x: "", y: "" },
      tags: []
    };


    const links = Wintermute.extractLinksFromText(passage.text);
    if (links) {
      passage.links = links;
    }

    const props = Wintermute.extractPropsFromText(passage.text);
    if (props) {
      passage.props = props;
    }

    const passageAttributes = ["name", "pid", "position", "tags"] as const;
    type PassageAttr = typeof passageAttributes[number];
    
    passageAttributes.forEach(function (attr: PassageAttr) {
      const value = passageEl.getAttribute(attr);
      if (value) {
        switch (attr) {
          case "position":
            const position = value.split(',');
            passage.position = {
              x: position[0],
              y: position[1]
            }
            break;
          case "tags":
            passage.tags = value.split(" ");
            break;
          default:
            passage[attr] = value;
        }
      }
    });

    return passage;
  },

  convertStory: function (storyEl: HTMLElement) {
    const passages = storyEl.getElementsByTagName("tw-passagedata") as HTMLCollectionOf<HTMLElement>;
    const convertedPassages = Array.from(passages).map(Wintermute.convertPassage);

    const story: Story = {
      passages: convertedPassages,
      name: "",
      startnode: "",
      creator: "",
      creatorVersion: "",
      ifid: ""
    };

    const storyAttributes = ["name", "startnode", "creator", "creator-version", "ifid"] as const; 
    type StoryAttr = typeof storyAttributes[number];

    storyAttributes.forEach(function (attr: StoryAttr) {
      const value = storyEl.getAttribute(attr);
      if (value) {
        switch (attr) {
          case "creator-version":
            story.creatorVersion = value;
            break;
          default:
            story[attr] = value;
        }
      }
    });

    // Add PIDs to links
    const pidsByName: Record<string, string> = {};
    story.passages.forEach(function (passage) {
      pidsByName[passage.name] = passage.pid;
    });

    story.passages.forEach(function (passage) {
      if (!passage.links) return;
      passage.links.forEach(function (link) {
        link.pid = pidsByName[link.link];
        if (!link.pid) {
          link.broken = true;
        }
      });
    });

    return story;
  },

  convert: function () {
    const storyData = document.getElementsByTagName("tw-storydata")[0] as HTMLElement;
    const json = JSON.stringify(Wintermute.convertStory(storyData), null, 2);
    document.getElementById("output")!.innerHTML = json;
  }
}

Wintermute.convert();